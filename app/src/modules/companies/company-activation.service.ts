import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { randomBytes } from 'crypto';
import { PrismaService } from '../../common/prisma/prisma.service';
import { JwtUser } from '../../auth/jwt-user.interface';
import { CreateActivationCodeDto } from './dto/create-activation-code.dto';
import { ActivationCodeResponseDto } from './dto/activation-code-response.dto';

interface ActivateInput {
  code: string;
  phone: string;
  displayName?: string | null;
}

export interface ActivationResult {
  ok: boolean;
  message: string;
  tenantId?: string;
  companyName?: string;
  whatsappUserId?: string;
  role?: string;
  permissions?: string[];
}

@Injectable()
export class CompanyActivationService {
  constructor(private readonly prisma: PrismaService) {}

  async createActivationCode(
    actor: JwtUser,
    companyRef: string,
    dto: CreateActivationCodeDto,
  ): Promise<ActivationCodeResponseDto> {
    const tenant = await this.resolveTenantForActor(actor, companyRef);
    const plainCode = this.generateCode();
    const normalized = this.normalizeCode(plainCode);
    const codeHash = await bcrypt.hash(normalized, 12);
    const permissions = dto.permissions ?? ['financial_entries:create'];

    const created = await this.prisma.companyActivationCode.create({
      data: {
        tenantId: tenant.id,
        reference: this.generateReference(),
        codeHash,
        codePrefix: this.prefix(normalized),
        role: dto.role ?? 'FINANCE',
        permissions: JSON.stringify(permissions),
        maxUses: dto.maxUses ?? 1,
        expiresAt: dto.expiresAt ? new Date(dto.expiresAt) : this.defaultExpiration(),
        createdBy: actor.sub,
      },
    });

    await this.log({
      tenantId: tenant.id,
      action: 'ACTIVATION_CODE_CREATED',
      status: 'ACTIVE',
      description: 'Codigo de ativacao criado pelo administrador.',
      metadata: { role: created.role, maxUses: created.maxUses },
    });

    return { ...this.toResponse(created), code: plainCode };
  }

  async listActivationCodes(
    actor: JwtUser,
    companyRef: string,
  ): Promise<ActivationCodeResponseDto[]> {
    const tenant = await this.resolveTenantForActor(actor, companyRef);
    const codes = await this.prisma.companyActivationCode.findMany({
      where: { tenantId: tenant.id },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
    return codes.map((code) => this.toResponse(code));
  }

  async revokeActivationCode(
    actor: JwtUser,
    companyRef: string,
    reference: string,
  ): Promise<ActivationCodeResponseDto> {
    const tenant = await this.resolveTenantForActor(actor, companyRef);
    const current = await this.prisma.companyActivationCode.findFirst({
      where: { tenantId: tenant.id, reference },
    });
    if (!current) {
      throw new NotFoundException('Codigo de ativacao nao encontrado.');
    }

    const updated = await this.prisma.companyActivationCode.update({
      where: { id: current.id },
      data: { status: 'REVOKED', revokedAt: new Date() },
    });
    await this.log({
      tenantId: tenant.id,
      action: 'ACTIVATION_CODE_REVOKED',
      status: 'REVOKED',
      description: 'Codigo de ativacao revogado pelo administrador.',
      metadata: { reference },
    });
    return this.toResponse(updated);
  }

  async activateWithCode(input: ActivateInput): Promise<ActivationResult> {
    const normalizedCode = this.normalizeCode(input.code);
    const phone = this.normalizePhone(input.phone);
    if (!normalizedCode || !phone) {
      return { ok: false, message: 'Codigo de ativacao invalido.' };
    }

    const candidates = await this.prisma.companyActivationCode.findMany({
      where: {
        codePrefix: this.prefix(normalizedCode),
        status: 'ACTIVE',
      },
      take: 20,
    });

    for (const candidate of candidates) {
      if (!(await bcrypt.compare(normalizedCode, candidate.codeHash))) continue;
      return this.activateMatchedCode(candidate.id, phone, input.displayName ?? null);
    }

    await this.log({
      tenantId: 'platform',
      phone,
      action: 'ACTIVATION_CODE_INVALID',
      status: 'INVALID',
      description: 'Tentativa de ativacao com codigo inexistente.',
    });
    return {
      ok: false,
      message:
        'Codigo invalido, expirado, usado ou revogado. Solicite um novo codigo ao administrador.',
    };
  }

  extractCode(message: string): string | null {
    const match = message.match(/WEBBA[-\s]?[A-Z0-9]{4}[-\s]?[A-Z0-9]{4}[-\s]?[A-Z0-9]{4}/i);
    return match ? match[0] : null;
  }

  private async activateMatchedCode(
    activationCodeId: string,
    phone: string,
    displayName: string | null,
  ): Promise<ActivationResult> {
    return this.prisma.$transaction(async (db) => {
      const code = await db.companyActivationCode.findUnique({
        where: { id: activationCodeId },
      });
      if (!code || code.status !== 'ACTIVE') {
        return {
          ok: false,
          message:
            'Codigo invalido, expirado, usado ou revogado. Solicite um novo codigo ao administrador.',
        };
      }

      if (code.expiresAt && code.expiresAt.getTime() < Date.now()) {
        await db.companyActivationCode.update({
          where: { id: code.id },
          data: { status: 'EXPIRED' },
        });
        await db.companyActivationLog.create({
          data: {
            tenantId: code.tenantId,
            phone,
            action: 'ACTIVATION_CODE_EXPIRED',
            status: 'EXPIRED',
            description: 'Codigo expirado usado por WhatsApp.',
          },
        });
        return {
          ok: false,
          message: 'Esse codigo expirou. Solicite um novo codigo ao administrador.',
        };
      }

      if (code.usedCount >= code.maxUses) {
        await db.companyActivationCode.update({
          where: { id: code.id },
          data: { status: 'USED' },
        });
        return {
          ok: false,
          message: 'Esse codigo ja atingiu o limite de uso. Solicite um novo codigo.',
        };
      }

      const tenant = await db.tenant.findUnique({ where: { id: code.tenantId } });
      if (!tenant || tenant.status !== 'ACTIVE') {
        await db.companyActivationLog.create({
          data: {
            tenantId: code.tenantId,
            phone,
            action: 'ACTIVATION_BLOCKED_BY_COMPANY_STATUS',
            status: tenant?.status ?? 'NOT_FOUND',
            description: 'Empresa sem status ativo tentou ativar WhatsApp.',
          },
        });
        return {
          ok: false,
          message:
            tenant?.status === 'SUSPENDED'
              ? 'Sua empresa esta bloqueada para uso do robo. Entre em contato com o suporte.'
              : 'Sua empresa esta inativa no sistema. Entre em contato com o administrador.',
        };
      }

      const existing = await db.whatsappUser.findUnique({ where: { phone } });
      if (existing && existing.tenantId !== code.tenantId) {
        await db.companyActivationLog.create({
          data: {
            tenantId: code.tenantId,
            whatsappUserId: existing.id,
            phone,
            action: 'ACTIVATION_PHONE_ALREADY_LINKED',
            status: 'DENIED',
            description: 'Numero ja esta vinculado a outra empresa.',
          },
        });
        return {
          ok: false,
          message:
            'Este numero ja esta vinculado a outra empresa. Entre em contato com o suporte.',
        };
      }

      const permissions = this.parsePermissions(code.permissions);
      const whatsappUser = await db.whatsappUser.upsert({
        where: { phone },
        update: {
          tenantId: code.tenantId,
          displayName,
          role: code.role,
          permissions: JSON.stringify(permissions),
          status: 'ACTIVE',
          lastSeenAt: new Date(),
        },
        create: {
          tenantId: code.tenantId,
          phone,
          displayName,
          role: code.role,
          permissions: JSON.stringify(permissions),
          status: 'ACTIVE',
          lastSeenAt: new Date(),
        },
      });

      const usedCount = code.usedCount + 1;
      await db.companyActivationCode.update({
        where: { id: code.id },
        data: {
          usedCount,
          status: usedCount >= code.maxUses ? 'USED' : 'ACTIVE',
        },
      });
      await db.companyActivationLog.create({
        data: {
          tenantId: code.tenantId,
          whatsappUserId: whatsappUser.id,
          phone,
          action: 'ACTIVATION_CODE_USED',
          status: 'ACTIVE',
          description: 'Numero ativado com sucesso.',
          metadata: JSON.stringify({ role: code.role }),
        },
      });

      return {
        ok: true,
        tenantId: tenant.id,
        companyName: tenant.name,
        whatsappUserId: whatsappUser.id,
        role: code.role,
        permissions,
        message: `Numero ativado com sucesso para ${tenant.name}. Agora voce pode enviar comprovantes.`,
      };
    });
  }

  private async resolveTenantForActor(actor: JwtUser, companyRef: string) {
    const tenant = await this.prisma.tenant.findFirst({
      where: { OR: [{ id: companyRef }, { slug: companyRef }] },
    });
    if (!tenant) throw new NotFoundException('Empresa nao encontrada.');
    if (actor.role !== 'SUPERADMIN' && actor.tenantId !== tenant.id) {
      throw new ForbiddenException('Voce nao pode gerenciar codigos desta empresa.');
    }
    return tenant;
  }

  private toResponse(code: {
    reference: string;
    codePrefix: string;
    role: string;
    permissions: string | null;
    maxUses: number;
    usedCount: number;
    expiresAt: Date | null;
    status: string;
    createdAt: Date;
    revokedAt?: Date | null;
  }): ActivationCodeResponseDto {
    return {
      reference: code.reference,
      codePrefix: code.codePrefix,
      role: code.role,
      permissions: this.parsePermissions(code.permissions),
      maxUses: code.maxUses,
      usedCount: code.usedCount,
      expiresAt: code.expiresAt,
      status: code.status,
      createdAt: code.createdAt,
      revokedAt: code.revokedAt ?? null,
    };
  }

  private generateCode(): string {
    const parts = [this.segment(), this.segment(), this.segment()];
    return `WEBBA-${parts.join('-')}`;
  }

  private generateReference(): string {
    return `act_${randomBytes(9).toString('hex')}`;
  }

  private segment(): string {
    return randomBytes(2).toString('hex').toUpperCase();
  }

  private defaultExpiration(): Date {
    const date = new Date();
    date.setDate(date.getDate() + 7);
    return date;
  }

  private normalizeCode(code: string): string {
    return code.toUpperCase().replace(/[^A-Z0-9]/g, '');
  }

  private prefix(code: string): string {
    return code.slice(0, 16);
  }

  private normalizePhone(phone: string): string {
    return phone.replace(/\D/g, '');
  }

  private parsePermissions(raw: string | null): string[] {
    if (!raw) return [];
    try {
      const value = JSON.parse(raw) as unknown;
      return Array.isArray(value) ? value.filter((item) => typeof item === 'string') : [];
    } catch {
      return [];
    }
  }

  private async log(input: {
    tenantId: string;
    phone?: string;
    action: string;
    status?: string;
    description?: string;
    metadata?: Record<string, unknown>;
  }) {
    await this.prisma.companyActivationLog.create({
      data: {
        tenantId: input.tenantId,
        phone: input.phone ?? null,
        action: input.action,
        status: input.status ?? null,
        description: input.description ?? null,
        metadata: input.metadata ? JSON.stringify(input.metadata) : null,
      },
    });
  }
}
