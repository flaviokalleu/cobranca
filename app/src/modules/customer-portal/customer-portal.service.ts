import { Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../../common/prisma/prisma.service';
import { ChargesService } from '../charges/charges.service';

interface PortalPayload {
  tenantId: string;
  customerId: string;
}

@Injectable()
export class CustomerPortalService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly charges: ChargesService,
  ) {}

  async createToken(tenantId: string, customerId: string) {
    const customer = await this.prisma.customer.findFirst({ where: { tenantId, id: customerId } });
    if (!customer) throw new NotFoundException('Cliente nao encontrado.');
    const token = await this.jwt.signAsync(
      { tenantId, customerId },
      { secret: process.env.PORTAL_JWT_SECRET ?? process.env.JWT_SECRET ?? 'portal-dev-secret', expiresIn: '30d' },
    );
    return { token, url: `/portal/${token}` };
  }

  async createTokenFromCharge(tenantId: string, chargeId: string) {
    const charge = await this.prisma.charge.findFirst({ where: { tenantId, id: chargeId } });
    if (!charge) throw new NotFoundException('Cobranca nao encontrada.');
    return this.createToken(tenantId, charge.customerId);
  }

  async getPortal(token: string) {
    const payload = await this.verify(token);
    const customer = await this.prisma.customer.findFirst({
      where: { tenantId: payload.tenantId, id: payload.customerId },
      select: { name: true, email: true, phone: true },
    });
    if (!customer) throw new NotFoundException('Portal nao encontrado.');
    const charges = await this.prisma.charge.findMany({
      where: { tenantId: payload.tenantId, customerId: payload.customerId, status: { in: ['PENDING', 'PAID'] } },
      orderBy: { dueDate: 'asc' },
      select: {
        id: true,
        description: true,
        amountCents: true,
        paidAmountCents: true,
        dueDate: true,
        paidAt: true,
        status: true,
      },
    });
    const settings = await this.prisma.settings.findUnique({
      where: { tenantId: payload.tenantId },
      select: { merchantName: true, companyName: true, logoUrl: true },
    });
    return { customer, settings, charges };
  }

  async pix(token: string, chargeId: string) {
    const payload = await this.verify(token);
    const charge = await this.prisma.charge.findFirst({
      where: { id: chargeId, tenantId: payload.tenantId, customerId: payload.customerId },
    });
    if (!charge) throw new NotFoundException('Cobranca nao encontrada no portal.');
    return this.charges.getPix(payload.tenantId, charge.id);
  }

  private async verify(token: string): Promise<PortalPayload> {
    try {
      return await this.jwt.verifyAsync<PortalPayload>(token, {
        secret: process.env.PORTAL_JWT_SECRET ?? process.env.JWT_SECRET ?? 'portal-dev-secret',
      });
    } catch {
      throw new UnauthorizedException('Token do portal invalido ou expirado.');
    }
  }
}
