import {
  BadRequestException,
  Injectable,
  UnauthorizedException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../common/prisma/prisma.service';
import { AuditService } from '../common/audit/audit.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { Role } from './jwt-user.interface';
import { TenantsService } from '../modules/tenants/tenants.service';

interface UserRecord {
  id: string;
  tenantId: string;
  email: string;
  passwordHash: string;
  role: string;
}

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly audit: AuditService,
    private readonly tenants: TenantsService,
  ) {}

  /// Cria uma EMPRESA nova + seu primeiro usuario (ADMIN) + assinatura FREE.
  /// (Onboarding seguro: nao da mais para entrar numa empresa existente pelo cadastro.)
  async register(dto: RegisterDto) {
    const tenant = await this.tenants.createTenant(dto.companyName);
    const passwordHash = await bcrypt.hash(dto.password, 10);
    const user = await this.prisma.user.create({
      data: {
        tenantId: tenant.id,
        email: dto.email,
        passwordHash,
        role: 'ADMIN',
      },
    });
    await this.prisma.subscription.create({
      data: { tenantId: tenant.id, planCode: 'FREE', status: 'TRIALING' },
    });
    await this.audit.record({
      tenantId: tenant.id,
      actor: user.email,
      action: 'TENANT_REGISTERED',
      entityType: 'Tenant',
      entityId: tenant.id,
      metadata: { slug: tenant.slug },
    });
    return this.sign(user);
  }

  async login(dto: LoginDto) {
    const user = await this.prisma.user.findFirst({
      where: { tenantId: dto.tenantId, email: dto.email },
    });
    if (!user || !(await bcrypt.compare(dto.password, user.passwordHash))) {
      throw new UnauthorizedException('Credenciais invalidas.');
    }
    return this.sign(user);
  }

  /// Criacao de usuarios adicionais (somente ADMIN, ver UsersController).
  async createUser(tenantId: string, actor: string, dto: CreateUserDto) {
    const exists = await this.prisma.user.findFirst({
      where: { tenantId, email: dto.email },
    });
    if (exists) {
      throw new ConflictException('E-mail ja cadastrado neste tenant.');
    }
    const passwordHash = await bcrypt.hash(dto.password, 10);
    const user = await this.prisma.user.create({
      data: { tenantId, email: dto.email, passwordHash, role: dto.role },
    });
    await this.audit.record({
      tenantId,
      actor,
      action: 'USER_CREATED',
      entityType: 'User',
      entityId: user.id,
      metadata: { role: dto.role },
    });
    return { id: user.id, email: user.email, role: user.role as Role };
  }

  list(tenantId: string) {
    return this.prisma.user.findMany({
      where: { tenantId },
      select: { id: true, email: true, role: true, createdAt: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async updateUser(
    tenantId: string,
    actorId: string,
    actor: string,
    id: string,
    dto: UpdateUserDto,
  ) {
    const user = await this.prisma.user.findFirst({ where: { id, tenantId } });
    if (!user) throw new NotFoundException('Usuario nao encontrado neste tenant.');
    if (dto.email && dto.email !== user.email) {
      const exists = await this.prisma.user.findFirst({
        where: { tenantId, email: dto.email },
      });
      if (exists) throw new ConflictException('E-mail ja cadastrado neste tenant.');
    }
    if (dto.role && dto.role !== 'ADMIN' && user.role === 'ADMIN') {
      await this.ensureAnotherAdmin(tenantId, id);
    }
    if (actorId === id && dto.role && dto.role !== user.role) {
      throw new BadRequestException('Voce nao pode alterar o proprio papel.');
    }

    const passwordHash = dto.password ? await bcrypt.hash(dto.password, 10) : undefined;
    const updated = await this.prisma.user.update({
      where: { id: user.id },
      data: {
        email: dto.email,
        passwordHash,
        role: dto.role,
      },
      select: { id: true, email: true, role: true, createdAt: true },
    });
    await this.audit.record({
      tenantId,
      actor,
      action: 'USER_UPDATED',
      entityType: 'User',
      entityId: user.id,
      metadata: { role: updated.role },
    });
    return updated;
  }

  async deleteUser(tenantId: string, actorId: string, actor: string, id: string) {
    if (actorId === id) {
      throw new BadRequestException('Voce nao pode excluir o proprio usuario.');
    }
    const user = await this.prisma.user.findFirst({ where: { id, tenantId } });
    if (!user) throw new NotFoundException('Usuario nao encontrado neste tenant.');
    if (user.role === 'ADMIN') {
      await this.ensureAnotherAdmin(tenantId, id);
    }
    await this.prisma.user.delete({ where: { id: user.id } });
    await this.audit.record({
      tenantId,
      actor,
      action: 'USER_DELETED',
      entityType: 'User',
      entityId: user.id,
    });
    return { ok: true };
  }

  private sign(user: UserRecord) {
    const accessToken = this.jwt.sign({
      sub: user.id,
      tenantId: user.tenantId,
      role: user.role,
      email: user.email,
    });
    return { accessToken, role: user.role as Role, tenantId: user.tenantId };
  }

  private async ensureAnotherAdmin(tenantId: string, excludedUserId: string) {
    const admins = await this.prisma.user.count({
      where: {
        tenantId,
        role: 'ADMIN',
        id: { not: excludedUserId },
      },
    });
    if (admins === 0) {
      throw new BadRequestException('O tenant precisa manter ao menos um ADMIN.');
    }
  }
}
