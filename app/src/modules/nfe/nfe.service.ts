import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { AuditService } from '../../common/audit/audit.service';
import { PrismaService } from '../../common/prisma/prisma.service';

@Injectable()
export class NfeService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async emitForCharge(tenantId: string, chargeId: string) {
    const charge = await this.prisma.charge.findFirst({
      where: { tenantId, id: chargeId },
      include: { customer: true, nfe: true },
    });
    if (!charge) throw new NotFoundException('Cobranca nao encontrada.');
    if (charge.status !== 'PAID') throw new BadRequestException('NF-e/NFS-e so pode ser emitida para cobranca paga.');
    if (charge.nfe) return charge.nfe;

    const settings = await this.prisma.settings.findUnique({ where: { tenantId } });
    const sandbox = process.env.NFE_SANDBOX !== 'false' || !process.env.NUVEM_FISCAL_TOKEN;
    const payload = {
      provider: 'nuvem-fiscal',
      sandbox,
      chargeId: charge.id,
      customer: {
        name: charge.customer.name,
        document: charge.customer.document,
        email: charge.customer.email,
      },
      service: {
        code: settings?.nfeCodServico ?? '0000',
        cityCode: settings?.nfeCodMunicipio ?? '3550308',
        amountCents: charge.paidAmountCents ?? charge.amountCents,
        description: charge.description,
      },
    };
    const externalId = sandbox ? `sandbox-${charge.id}` : await this.sendToNuvemFiscal(payload);
    const nfe = await this.prisma.nFe.create({
      data: {
        tenantId,
        chargeId: charge.id,
        provider: 'nuvem-fiscal',
        externalId,
        status: sandbox ? 'SANDBOX' : 'PROCESSING',
        pdfUrl: sandbox ? `/nfe/${externalId}.pdf` : null,
        payload,
      },
    });
    await this.audit.record({ tenantId, actor: 'system', action: 'NFE_EMITTED', entityType: 'NFe', entityId: nfe.id, metadata: { sandbox } });
    return nfe;
  }

  list(tenantId: string) {
    return this.prisma.nFe.findMany({ where: { tenantId }, include: { charge: { select: { description: true, amountCents: true } } }, orderBy: { createdAt: 'desc' } });
  }

  async status(tenantId: string, id: string) {
    const nfe = await this.prisma.nFe.findFirst({ where: { tenantId, id } });
    if (!nfe) throw new NotFoundException('Nota fiscal nao encontrada.');
    if (nfe.status === 'PROCESSING' && !process.env.NUVEM_FISCAL_TOKEN) {
      return this.prisma.nFe.update({ where: { id: nfe.id }, data: { status: 'SANDBOX' } });
    }
    return nfe;
  }

  async cancel(tenantId: string, id: string, reason: string) {
    const nfe = await this.prisma.nFe.findFirst({ where: { tenantId, id } });
    if (!nfe) throw new NotFoundException('Nota fiscal nao encontrada.');
    const updated = await this.prisma.nFe.update({
      where: { id: nfe.id },
      data: { status: 'CANCELED', error: reason },
    });
    await this.audit.record({ tenantId, actor: 'system', action: 'NFE_CANCELED', entityType: 'NFe', entityId: id, metadata: { reason } });
    return updated;
  }

  private async sendToNuvemFiscal(payload: unknown): Promise<string> {
    const endpoint = process.env.NUVEM_FISCAL_BASE_URL ?? 'https://api.nuvemfiscal.com.br';
    const res = await fetch(`${endpoint}/nfse`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        authorization: `Bearer ${process.env.NUVEM_FISCAL_TOKEN}`,
      },
      body: JSON.stringify(payload),
    });
    if (!res.ok) throw new BadRequestException(`Nuvem Fiscal rejeitou emissao (${res.status}).`);
    const data = (await res.json()) as { id?: string };
    return data.id ?? `nuvem-${Date.now()}`;
  }
}
