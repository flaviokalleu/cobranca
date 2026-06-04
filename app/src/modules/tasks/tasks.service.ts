import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { CreateTaskDto } from './dto/create-task.dto';

@Injectable()
export class TasksService {
  constructor(private readonly prisma: PrismaService) {}

  create(tenantId: string, dto: CreateTaskDto) {
    return this.prisma.task.create({
      data: {
        tenantId,
        title: dto.title,
        notes: dto.notes ?? null,
        dueDate: dto.dueDate ? new Date(dto.dueDate) : null,
        priority: dto.priority ?? 'MED',
        assignee: dto.assignee ?? null,
      },
    });
  }

  list(tenantId: string) {
    return this.prisma.task.findMany({
      where: { tenantId },
      orderBy: [{ done: 'asc' }, { createdAt: 'desc' }],
    });
  }

  async toggle(tenantId: string, id: string) {
    const task = await this.prisma.task.findFirst({ where: { id, tenantId } });
    if (!task) throw new NotFoundException('Tarefa não encontrada.');
    return this.prisma.task.update({
      where: { id: task.id },
      data: { done: !task.done },
    });
  }
}
