import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { randomBytes, createHash } from 'node:crypto';
import * as bcrypt from 'bcryptjs';
import { AppMailService } from '../../common/mail/mail.service';
import { PrismaService } from '../../common/prisma/prisma.service';
import { CreateInvitationDto, AcceptInvitationDto } from './dto/invitation.dto';

@Injectable()
export class InvitationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly mail: AppMailService,
  ) {}

  async create(tenantId: string, dto: CreateInvitationDto) {
    const tenant = await this.prisma.tenant.findUnique({ where: { id: tenantId } });
    const token = randomBytes(24).toString('base64url');
    const invitation = await this.prisma.invitation.create({
      data: {
        tenantId,
        email: dto.email.toLowerCase(),
        role: dto.role,
        tokenHash: this.hash(token),
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
    });
    const url = `${process.env.PUBLIC_WEB_URL ?? 'http://localhost:3001'}/convite/${token}`;
    await this.mail.sendNotification(dto.email, {
      title: `Convite para acessar ${tenant?.name ?? 'a empresa'}`,
      message: `Voce foi convidado como ${dto.role}. Acesse: ${url}`,
    });
    return { ...invitation, token: undefined, acceptUrl: url };
  }

  list(tenantId: string) {
    return this.prisma.invitation.findMany({ where: { tenantId }, orderBy: { createdAt: 'desc' } });
  }

  async revoke(tenantId: string, id: string) {
    const invitation = await this.prisma.invitation.findFirst({ where: { tenantId, id } });
    if (!invitation) throw new NotFoundException('Convite nao encontrado.');
    return this.prisma.invitation.update({ where: { id }, data: { revokedAt: new Date() } });
  }

  async preview(token: string) {
    const invitation = await this.findUsable(token);
    const tenant = await this.prisma.tenant.findUnique({ where: { id: invitation.tenantId } });
    return { email: invitation.email, role: invitation.role, companyName: tenant?.name ?? 'Empresa' };
  }

  async accept(token: string, dto: AcceptInvitationDto) {
    const invitation = await this.findUsable(token);
    const existing = await this.prisma.user.findFirst({
      where: { tenantId: invitation.tenantId, email: invitation.email },
    });
    if (existing) throw new ConflictException('Usuario ja existe neste tenant.');
    const user = await this.prisma.user.create({
      data: {
        tenantId: invitation.tenantId,
        email: invitation.email,
        role: invitation.role,
        passwordHash: await bcrypt.hash(dto.password, 10),
      },
    });
    await this.prisma.invitation.update({ where: { id: invitation.id }, data: { usedAt: new Date() } });
    return { id: user.id, email: user.email, role: user.role };
  }

  private async findUsable(token: string) {
    const invitation = await this.prisma.invitation.findUnique({ where: { tokenHash: this.hash(token) } });
    if (!invitation || invitation.usedAt || invitation.revokedAt || invitation.expiresAt < new Date()) {
      throw new NotFoundException('Convite invalido ou expirado.');
    }
    return invitation;
  }

  private hash(token: string) {
    return createHash('sha256').update(token).digest('hex');
  }
}
