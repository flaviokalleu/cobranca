import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { randomBytes } from 'node:crypto';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { generateSecret, generateURI, verify } from 'otplib';
import { PrismaService } from '../common/prisma/prisma.service';
import { AuditService } from '../common/audit/audit.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { TwoFactorCodeDto } from './dto/two-factor-code.dto';
import { Role } from './jwt-user.interface';
import { TenantsService } from '../modules/tenants/tenants.service';

interface UserRecord {
  id: string;
  tenantId: string;
  email: string;
  passwordHash: string;
  role: string;
  twoFactorSecret?: string | null;
  twoFactorEnabled?: boolean;
  twoFactorBackupCodes?: string[];
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
    let candidates = await this.prisma.user.findMany({
      where: { email: dto.email },
    });

    if (!candidates.length) {
      throw new UnauthorizedException('Credenciais invalidas.');
    }

    // Se vier slug da empresa, restringe ao tenant correto
    if (dto.tenantSlug) {
      const tenant = await this.prisma.tenant.findUnique({
        where: { slug: dto.tenantSlug },
      });
      if (!tenant) throw new UnauthorizedException('Empresa nao encontrada.');
      candidates = candidates.filter((u) => u.tenantId === tenant.id);
      if (!candidates.length) {
        throw new UnauthorizedException('Usuario nao encontrado nesta empresa.');
      }
    }

    // Valida senha (na pratica sera um candidato unico)
    let matched: (typeof candidates)[number] | undefined;
    for (const u of candidates) {
      if (await bcrypt.compare(dto.password, u.passwordHash)) {
        matched = u;
        break;
      }
    }
    if (!matched) throw new UnauthorizedException('Credenciais invalidas.');

    const tenant = await this.prisma.tenant.findUnique({ where: { id: matched.tenantId } });
    if (tenant?.status === 'SUSPENDED') {
      throw new ForbiddenException('Empresa suspensa. Contate o suporte.');
    }

    if (matched.twoFactorEnabled) {
      if (!dto.twoFactorCode) {
        return { requiresTwoFactor: true, message: 'Codigo 2FA obrigatorio.' };
      }
      const valid = await this.verifyTwoFactor(matched, dto.twoFactorCode);
      if (!valid) {
        throw new UnauthorizedException('Codigo 2FA invalido.');
      }
    }

    return this.sign(matched);
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
    return {
      id: user.id,
      email: user.email,
      role: user.role as Role,
      twoFactorEnabled: user.twoFactorEnabled,
    };
  }

  list(tenantId: string) {
    return this.prisma.user.findMany({
      where: { tenantId },
      select: { id: true, email: true, role: true, twoFactorEnabled: true, createdAt: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  me(tenantId: string, userId: string) {
    return this.prisma.user.findFirst({
      where: { id: userId, tenantId },
      select: {
        email: true,
        role: true,
        twoFactorEnabled: true,
        createdAt: true,
      },
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

  async setupTwoFactor(tenantId: string, actorId: string, actor: string) {
    const user = await this.prisma.user.findFirst({
      where: { id: actorId, tenantId },
      select: { id: true, email: true, twoFactorEnabled: true },
    });
    if (!user) throw new NotFoundException('Usuario nao encontrado.');
    if (user.twoFactorEnabled) {
      throw new BadRequestException('2FA ja esta ativo. Desabilite antes de gerar novo segredo.');
    }

    const secret = generateSecret();
    const issuer = process.env.TWO_FACTOR_ISSUER ?? 'Cobranca SaaS';
    const otpauthUrl = generateURI({ issuer, label: user.email, secret });

    await this.prisma.user.update({
      where: { id: user.id },
      data: { twoFactorSecret: secret, twoFactorBackupCodes: [] },
    });
    await this.audit.record({
      tenantId,
      actor,
      action: 'TWO_FACTOR_SETUP_STARTED',
      entityType: 'User',
      entityId: user.id,
    });

    return { secret, otpauthUrl };
  }

  async enableTwoFactor(
    tenantId: string,
    actorId: string,
    actor: string,
    dto: TwoFactorCodeDto,
  ) {
    const user = await this.prisma.user.findFirst({
      where: { id: actorId, tenantId },
      select: { id: true, twoFactorSecret: true },
    });
    if (!user?.twoFactorSecret) {
      throw new BadRequestException('Gere o segredo 2FA antes de habilitar.');
    }
    const result = await verify({
      token: this.cleanCode(dto.code),
      secret: user.twoFactorSecret,
      epochTolerance: 30,
    });
    if (!result.valid) {
      throw new UnauthorizedException('Codigo 2FA invalido.');
    }

    const backupCodes = this.generateBackupCodes();
    const hashedBackupCodes = await Promise.all(
      backupCodes.map((code) => bcrypt.hash(this.cleanBackupCode(code), 10)),
    );
    await this.prisma.user.update({
      where: { id: user.id },
      data: { twoFactorEnabled: true, twoFactorBackupCodes: hashedBackupCodes },
    });
    await this.audit.record({
      tenantId,
      actor,
      action: 'TWO_FACTOR_ENABLED',
      entityType: 'User',
      entityId: user.id,
    });

    return { enabled: true, backupCodes };
  }

  async disableTwoFactor(
    tenantId: string,
    actorId: string,
    actor: string,
    dto: TwoFactorCodeDto,
  ) {
    const user = await this.prisma.user.findFirst({
      where: { id: actorId, tenantId },
    });
    if (!user) throw new NotFoundException('Usuario nao encontrado.');
    if (!user.twoFactorEnabled) {
      return { enabled: false };
    }
    const valid = await this.verifyTwoFactor(user, dto.code);
    if (!valid) {
      throw new UnauthorizedException('Codigo 2FA invalido.');
    }
    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        twoFactorEnabled: false,
        twoFactorSecret: null,
        twoFactorBackupCodes: [],
      },
    });
    await this.audit.record({
      tenantId,
      actor,
      action: 'TWO_FACTOR_DISABLED',
      entityType: 'User',
      entityId: user.id,
    });

    return { enabled: false };
  }

  async deleteUser(tenantId: string, actorId: string, actor: string, id: string) {
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
      metadata: { deletedOwnUser: actorId === id },
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

  private async verifyTwoFactor(user: UserRecord, code: string): Promise<boolean> {
    const cleanedCode = this.cleanCode(code);
    if (
      user.twoFactorSecret &&
      /^\d{6}$/.test(cleanedCode)
    ) {
      const result = await verify({
        token: cleanedCode,
        secret: user.twoFactorSecret,
        epochTolerance: 30,
      });
      if (result.valid) return true;
    }

    const backupCode = this.cleanBackupCode(code);
    const backupCodes = user.twoFactorBackupCodes ?? [];
    for (const [index, hash] of backupCodes.entries()) {
      if (await bcrypt.compare(backupCode, hash)) {
        const remaining = backupCodes.filter((_, i) => i !== index);
        await this.prisma.user.update({
          where: { id: user.id },
          data: { twoFactorBackupCodes: remaining },
        });
        return true;
      }
    }
    return false;
  }

  private generateBackupCodes(): string[] {
    return Array.from({ length: 8 }, () => {
      const raw = randomBytes(4).toString('hex').toUpperCase();
      return `${raw.slice(0, 4)}-${raw.slice(4)}`;
    });
  }

  private cleanCode(code: string): string {
    return code.replace(/\s/g, '');
  }

  private cleanBackupCode(code: string): string {
    return code.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
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
