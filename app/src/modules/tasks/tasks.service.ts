import { Injectable, NotFoundException } from '@nestjs/common';
import { AuditService } from '../../common/audit/audit.service';
import { PrismaService } from '../../common/prisma/prisma.service';
import { CreateTaskDto } from './dto/create-task.dto';
import { UpdateTaskDto } from './dto/update-task.dto';

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

  list(tenantId: string) {
    return this.prisma.task.findMany({
      where: { tenantId },
      orderBy: [{ done: 'asc' }, { createdAt: 'desc' }],
    });
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
        done: dto.done,
      },
    });
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
}
