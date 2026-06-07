import { Injectable, NotFoundException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { PrismaService } from '../../common/prisma/prisma.service';
import { CreateLeadDto } from './dto/create-lead.dto';
import { ChangeStageDto } from './dto/change-stage.dto';
import {
  paginated,
  paginationArgs,
  PaginationDto,
} from '../../common/dto/pagination.dto';

@Injectable()
export class LeadsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly events: EventEmitter2,
  ) {}

  async create(tenantId: string, dto: CreateLeadDto) {
    const lead = await this.prisma.$transaction(async (tx) => {
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
    this.events.emit('notification.realtime', {
      tenantId,
      type: 'lead.created',
      payload: { leadId: lead.id, name: lead.name },
    });
    return lead;
  }

  async list(tenantId: string, query: PaginationDto) {
    const { skip, take } = paginationArgs(query);
    const search = query.search?.trim();
    const where = {
      tenantId,
      ...(search
        ? {
            OR: [
              { name: { contains: search, mode: 'insensitive' as const } },
              { contact: { contains: search, mode: 'insensitive' as const } },
              { phone: { contains: search, mode: 'insensitive' as const } },
              { email: { contains: search, mode: 'insensitive' as const } },
            ],
          }
        : {}),
    };
    const [data, total] = await this.prisma.$transaction([
      this.prisma.lead.findMany({ where, orderBy: { createdAt: 'desc' }, skip, take }),
      this.prisma.lead.count({ where }),
    ]);
    return paginated(data, total, query);
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
