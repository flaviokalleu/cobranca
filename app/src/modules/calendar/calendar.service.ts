import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { AuditService } from '../../common/audit/audit.service';
import { CreateCalendarEventDto } from './dto/create-calendar-event.dto';
import { UpdateCalendarEventStatusDto } from './dto/update-calendar-event-status.dto';

@Injectable()
export class CalendarService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async create(tenantId: string, dto: CreateCalendarEventDto) {
    await this.validateReferences(tenantId, dto);

    const event = await this.prisma.calendarEvent.create({
      data: {
        tenantId,
        title: dto.title,
        type: dto.type ?? 'MEETING',
        startsAt: new Date(dto.startsAt),
        endsAt: dto.endsAt ? new Date(dto.endsAt) : null,
        customerId: dto.customerId ?? null,
        chargeId: dto.chargeId ?? null,
        payableId: dto.payableId ?? null,
        taskId: dto.taskId ?? null,
        notes: dto.notes ?? null,
      },
    });

    await this.audit.record({
      tenantId,
      actor: 'system',
      action: 'CALENDAR_EVENT_CREATED',
      entityType: 'CalendarEvent',
      entityId: event.id,
      metadata: { type: event.type, startsAt: event.startsAt.toISOString() },
    });

    return event;
  }

  list(tenantId: string, from?: string, to?: string) {
    return this.prisma.calendarEvent.findMany({
      where: {
        tenantId,
        ...(from || to
          ? {
              startsAt: {
                ...(from ? { gte: new Date(from) } : {}),
                ...(to ? { lte: new Date(to) } : {}),
              },
            }
          : {}),
      },
      orderBy: { startsAt: 'asc' },
    });
  }

  async updateStatus(
    tenantId: string,
    id: string,
    dto: UpdateCalendarEventStatusDto,
  ) {
    const current = await this.prisma.calendarEvent.findFirst({
      where: { id, tenantId },
    });
    if (!current) {
      throw new NotFoundException('Evento nao encontrado neste tenant.');
    }

    const event = await this.prisma.calendarEvent.update({
      where: { id: current.id },
      data: { status: dto.status },
    });

    await this.audit.record({
      tenantId,
      actor: 'system',
      action: 'CALENDAR_EVENT_STATUS_CHANGED',
      entityType: 'CalendarEvent',
      entityId: event.id,
      metadata: { from: current.status, to: event.status },
    });

    return event;
  }

  private async validateReferences(tenantId: string, dto: CreateCalendarEventDto) {
    if (dto.customerId) {
      const customer = await this.prisma.customer.findFirst({
        where: { id: dto.customerId, tenantId },
      });
      if (!customer) throw new NotFoundException('Cliente nao encontrado.');
    }
    if (dto.chargeId) {
      const charge = await this.prisma.charge.findFirst({
        where: { id: dto.chargeId, tenantId },
      });
      if (!charge) throw new NotFoundException('Cobranca nao encontrada.');
    }
    if (dto.payableId) {
      const payable = await this.prisma.payable.findFirst({
        where: { id: dto.payableId, tenantId },
      });
      if (!payable) throw new NotFoundException('Conta a pagar nao encontrada.');
    }
    if (dto.taskId) {
      const task = await this.prisma.task.findFirst({
        where: { id: dto.taskId, tenantId },
      });
      if (!task) throw new NotFoundException('Tarefa nao encontrada.');
    }
  }
}
