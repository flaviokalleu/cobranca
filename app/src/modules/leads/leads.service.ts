import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { CreateLeadDto } from './dto/create-lead.dto';
import { ChangeStageDto } from './dto/change-stage.dto';

@Injectable()
export class LeadsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(tenantId: string, dto: CreateLeadDto) {
    return this.prisma.$transaction(async (tx) => {
      const customer = await tx.customer.create({
        data: {
          tenantId,
          name: dto.name,
          document: dto.document ?? null,
          phone: dto.phone ?? '',
          whatsapp: dto.whatsapp ?? null,
          email: dto.email ?? null,
          city: dto.city ?? null,
          profession: dto.profession ?? null,
          incomeCents: dto.incomeCents ?? null,
          stage: 'LEAD',
        },
      });

      return tx.lead.create({
        data: {
          tenantId,
          name: dto.name,
          contact: dto.contact ?? null,
          document: dto.document ?? null,
          phone: dto.phone ?? null,
          whatsapp: dto.whatsapp ?? null,
          email: dto.email ?? null,
          city: dto.city ?? null,
          profession: dto.profession ?? null,
          incomeCents: dto.incomeCents ?? null,
          estimatedCents: dto.estimatedCents ?? 0,
          notes: dto.notes ?? null,
          customerId: customer.id,
        },
      });
    });
  }

  list(tenantId: string) {
    return this.prisma.lead.findMany({
      where: { tenantId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async syncCustomers(tenantId: string) {
    const leads = await this.prisma.lead.findMany({
      where: { tenantId, customerId: null },
    });
    let created = 0;
    for (const lead of leads) {
      const customer = await this.prisma.customer.create({
        data: {
          tenantId,
          name: lead.name,
          document: lead.document ?? null,
          phone: lead.phone ?? '',
          whatsapp: lead.whatsapp ?? null,
          email: lead.email ?? null,
          city: lead.city ?? null,
          profession: lead.profession ?? null,
          incomeCents: lead.incomeCents ?? null,
          stage: lead.stage,
        },
      });
      await this.prisma.lead.update({
        where: { id: lead.id },
        data: { customerId: customer.id },
      });
      created++;
    }
    return { synced: created };
  }

  async changeStage(tenantId: string, id: string, dto: ChangeStageDto) {
    const lead = await this.prisma.lead.findFirst({ where: { id, tenantId } });
    if (!lead) throw new NotFoundException('Lead não encontrado.');
    const updated = await this.prisma.lead.update({
      where: { id: lead.id },
      data: { stage: dto.stage },
    });
    if (lead.customerId) {
      await this.prisma.customer.update({
        where: { id: lead.customerId },
        data: { stage: dto.stage },
      });
    }
    return updated;
  }
}
