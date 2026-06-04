import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { WhatsappUserService } from './whatsapp-user.service';

export interface CompanyResolution {
  ok: boolean;
  message?: string;
  tenant?: { id: string; name: string; status: string };
  whatsappUser?: {
    id: string;
    tenantId: string;
    phone: string;
    displayName: string | null;
    role: string;
    permissions: string | null;
    status: string;
  };
}

@Injectable()
export class CompanyResolverService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly whatsappUsers: WhatsappUserService,
  ) {}

  async resolveByWhatsappPhone(phone: string): Promise<CompanyResolution> {
    const whatsappUser = await this.whatsappUsers.findByPhone(phone);
    if (!whatsappUser) {
      return {
        ok: false,
        message:
          'Envie seu codigo de ativacao para vincular este WhatsApp a sua empresa.',
      };
    }

    if (whatsappUser.status !== 'ACTIVE') {
      return {
        ok: false,
        whatsappUser,
        message: 'Seu usuario do robo esta inativo ou bloqueado. Entre em contato com o suporte.',
      };
    }

    const tenant = await this.prisma.tenant.findUnique({
      where: { id: whatsappUser.tenantId },
      select: { id: true, name: true, status: true },
    });
    if (!tenant) {
      return {
        ok: false,
        whatsappUser,
        message: 'Empresa nao encontrada. Entre em contato com o administrador.',
      };
    }
    if (tenant.status !== 'ACTIVE') {
      return {
        ok: false,
        tenant,
        whatsappUser,
        message:
          tenant.status === 'SUSPENDED'
            ? 'Sua empresa esta bloqueada para uso do robo. Entre em contato com o suporte.'
            : 'Sua empresa esta inativa no sistema. Entre em contato com o administrador.',
      };
    }

    await this.whatsappUsers.touch(phone);
    return { ok: true, tenant, whatsappUser };
  }
}
