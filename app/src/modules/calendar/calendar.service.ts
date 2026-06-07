import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { AuditService } from '../../common/audit/audit.service';
import { CreateCalendarEventDto } from './dto/create-calendar-event.dto';
import { UpdateCalendarEventStatusDto } from './dto/update-calendar-event-status.dto';
import { UpdateCalendarEventDto } from './dto/update-calendar-event.dto';
import { ListCalendarEventsDto } from './dto/list-calendar-events.dto';
import { paginated, paginationArgs } from '../../common/dto/pagination.dto';

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

  async list(tenantId: string, query: ListCalendarEventsDto) {
    const { skip, take } = paginationArgs(query);
    const search = query.search?.trim();
    const where = {
      tenantId,
      ...(query.from || query.to
        ? {
            startsAt: {
              ...(query.from ? { gte: new Date(query.from) } : {}),
              ...(query.to ? { lte: new Date(query.to) } : {}),
            },
          }
        : {}),
      ...(search
        ? {
            OR: [
              { title: { contains: search, mode: 'insensitive' as const } },
              { notes: { contains: search, mode: 'insensitive' as const } },
              { type: { contains: search, mode: 'insensitive' as const } },
            ],
          }
        : {}),
    };
    const [data, total] = await this.prisma.$transaction([
      this.prisma.calendarEvent.findMany({ where, orderBy: { startsAt: 'asc' }, skip, take }),
      this.prisma.calendarEvent.count({ where }),
    ]);
    return paginated(data, total, query);
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

  async update(tenantId: string, id: string, dto: UpdateCalendarEventDto) {
    const current = await this.prisma.calendarEvent.findFirst({
      where: { id, tenantId },
    });
    if (!current) {
      throw new NotFoundException('Evento nao encontrado neste tenant.');
    }
    await this.validateReferences(tenantId, dto);
    const event = await this.prisma.calendarEvent.update({
      where: { id: current.id },
      data: {
        title: dto.title,
        type: dto.type,
        startsAt: dto.startsAt ? new Date(dto.startsAt) : undefined,
        endsAt: dto.endsAt === undefined ? undefined : dto.endsAt ? new Date(dto.endsAt) : null,
        status: dto.status,
        customerId: dto.customerId === undefined ? undefined : dto.customerId,
        chargeId: dto.chargeId === undefined ? undefined : dto.chargeId,
        payableId: dto.payableId === undefined ? undefined : dto.payableId,
        taskId: dto.taskId === undefined ? undefined : dto.taskId,
        notes: dto.notes === undefined ? undefined : dto.notes,
      },
    });
    await this.audit.record({
      tenantId,
      actor: 'system',
      action: 'CALENDAR_EVENT_UPDATED',
      entityType: 'CalendarEvent',
      entityId: event.id,
      metadata: { type: event.type, startsAt: event.startsAt.toISOString() },
    });
    return event;
  }

  async remove(tenantId: string, id: string) {
    const current = await this.prisma.calendarEvent.findFirst({
      where: { id, tenantId },
    });
    if (!current) {
      throw new NotFoundException('Evento nao encontrado neste tenant.');
    }
    await this.prisma.calendarEvent.delete({ where: { id: current.id } });
    await this.audit.record({
      tenantId,
      actor: 'system',
      action: 'CALENDAR_EVENT_DELETED',
      entityType: 'CalendarEvent',
      entityId: current.id,
    });
    return { ok: true };
  }

  private async validateReferences(
    tenantId: string,
    dto: CreateCalendarEventDto | UpdateCalendarEventDto,
  ) {
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
