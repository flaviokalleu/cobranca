import { Injectable, NotFoundException } from '@nestjs/common';
import { AuditService } from '../../common/audit/audit.service';
import { PrismaService } from '../../common/prisma/prisma.service';
import { CreateTaskDto } from './dto/create-task.dto';
import { UpdateTaskDto } from './dto/update-task.dto';
import {
  paginated,
  paginationArgs,
  PaginationDto,
} from '../../common/dto/pagination.dto';

@Injectable()
export class TasksService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async create(tenantId: string, dto: CreateTaskDto) {
    const task = await this.prisma.task.create({
      data: {
        tenantId,
        title: dto.title,
        notes: dto.notes ?? null,
        dueDate: dto.dueDate ? new Date(dto.dueDate) : null,
        priority: dto.priority ?? 'MED',
        assignee: dto.assignee ?? null,
        recurrence: 'NONE',
      },
    });
    await this.audit.record({
      tenantId,
      actor: 'system',
      action: 'TASK_CREATED',
      entityType: 'Task',
      entityId: task.id,
    });
    return task;
  }

  async list(tenantId: string, query: PaginationDto) {
    const { skip, take } = paginationArgs(query);
    const search = query.search?.trim();
    const where = {
      tenantId,
      ...(search
        ? {
            OR: [
              { title: { contains: search, mode: 'insensitive' as const } },
              { notes: { contains: search, mode: 'insensitive' as const } },
              { assignee: { contains: search, mode: 'insensitive' as const } },
            ],
          }
        : {}),
    };
    const [data, total] = await this.prisma.$transaction([
      this.prisma.task.findMany({
        where,
        orderBy: [{ done: 'asc' }, { createdAt: 'desc' }],
        skip,
        take,
      }),
      this.prisma.task.count({ where }),
    ]);
    return paginated(data, total, query);
  }

  async toggle(tenantId: string, id: string) {
    const task = await this.prisma.task.findFirst({ where: { id, tenantId } });
    if (!task) throw new NotFoundException('Tarefa nao encontrada.');
    const updated = await this.prisma.task.update({
      where: { id: task.id },
      data: { done: !task.done },
    });
    await this.audit.record({
      tenantId,
      actor: 'system',
      action: 'TASK_TOGGLED',
      entityType: 'Task',
      entityId: task.id,
      metadata: { done: updated.done },
    });
    return updated;
  }

  async update(tenantId: string, id: string, dto: UpdateTaskDto) {
    const task = await this.prisma.task.findFirst({ where: { id, tenantId } });
    if (!task) throw new NotFoundException('Tarefa nao encontrada.');
    const updated = await this.prisma.task.update({
      where: { id: task.id },
      data: {
        title: dto.title,
        notes: dto.notes,
        dueDate: dto.dueDate ? new Date(dto.dueDate) : undefined,
        priority: dto.priority,
        assignee: dto.assignee,
        assigneeId: dto.assigneeId,
        recurrence: dto.recurrence,
        nextOccurrenceAt: dto.nextOccurrenceAt ? new Date(dto.nextOccurrenceAt) : undefined,
        estimatedMinutes: dto.estimatedMinutes,
        done: dto.done,
        completedAt: dto.done === true ? new Date() : dto.done === false ? null : undefined,
      },
    });
    if (dto.done === true && task.recurrence && task.recurrence !== 'NONE') {
      const nextDue = this.nextOccurrence(task.dueDate ?? new Date(), task.recurrence);
      await this.prisma.task.create({
        data: {
          tenantId,
          title: task.title,
          notes: task.notes,
          dueDate: nextDue,
          priority: task.priority,
          assignee: task.assignee,
          assigneeId: task.assigneeId,
          recurrence: task.recurrence,
          nextOccurrenceAt: this.nextOccurrence(nextDue, task.recurrence),
        },
      });
    }
    await this.audit.record({
      tenantId,
      actor: 'system',
      action: 'TASK_UPDATED',
      entityType: 'Task',
      entityId: task.id,
    });
    return updated;
  }

  async remove(tenantId: string, id: string) {
    const task = await this.prisma.task.findFirst({ where: { id, tenantId } });
    if (!task) throw new NotFoundException('Tarefa nao encontrada.');
    await this.prisma.task.delete({ where: { id: task.id } });
    await this.audit.record({
      tenantId,
      actor: 'system',
      action: 'TASK_DELETED',
      entityType: 'Task',
      entityId: task.id,
    });
    return { ok: true };
  }

  async addSubtask(tenantId: string, id: string, dto: CreateTaskDto) {
    const parent = await this.prisma.task.findFirst({ where: { id, tenantId } });
    if (!parent) throw new NotFoundException('Tarefa pai nao encontrada.');
    return this.prisma.task.create({
      data: {
        tenantId,
        parentId: parent.id,
        title: dto.title,
        notes: dto.notes ?? null,
        dueDate: dto.dueDate ? new Date(dto.dueDate) : null,
        priority: dto.priority ?? parent.priority,
        assignee: dto.assignee ?? parent.assignee,
      },
    });
  }

  get(tenantId: string, id: string) {
    return this.prisma.task.findFirst({
      where: { id, tenantId },
      include: { subtasks: true },
    });
  }

  async bulk(tenantId: string, ids: string[], action?: string, assignee?: string) {
    const tasks = await this.prisma.task.findMany({ where: { tenantId, id: { in: ids } }, select: { id: true } });
    const safeIds = tasks.map((task) => task.id);
    if (action === 'complete') {
      await this.prisma.task.updateMany({ where: { tenantId, id: { in: safeIds } }, data: { done: true, completedAt: new Date() } });
    }
    if (action === 'assign') {
      await this.prisma.task.updateMany({ where: { tenantId, id: { in: safeIds } }, data: { assignee } });
    }
    if (action === 'delete') {
      await this.prisma.task.deleteMany({ where: { tenantId, id: { in: safeIds } } });
    }
    return { ok: true, affected: safeIds.length };
  }

  private nextOccurrence(date: Date, recurrence: string) {
    const copy = new Date(date);
    if (recurrence === 'DAILY') copy.setDate(copy.getDate() + 1);
    else if (recurrence === 'WEEKLY') copy.setDate(copy.getDate() + 7);
    else if (recurrence === 'MONTHLY') copy.setMonth(copy.getMonth() + 1);
    return copy;
  }
}
