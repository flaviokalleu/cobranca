import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { CreateLeadDto } from './dto/create-lead.dto';
import { ChangeStageDto } from './dto/change-stage.dto';

@Injectable()
export class LeadsService {
  constructor(private readonly prisma: PrismaService) {}

  create(tenantId: string, dto: CreateLeadDto) {
    return this.prisma.lead.create({
      data: {
        tenantId,
        name: dto.name,
        contact: dto.contact ?? null,
        estimatedCents: dto.estimatedCents ?? 0,
        notes: dto.notes ?? null,
      },
    });
  }

  list(tenantId: string) {
    return this.prisma.lead.findMany({
      where: { tenantId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async changeStage(tenantId: string, id: string, dto: ChangeStageDto) {
    const lead = await this.prisma.lead.findFirst({ where: { id, tenantId } });
    if (!lead) throw new NotFoundException('Lead não encontrado.');
    return this.prisma.lead.update({
      where: { id: lead.id },
      data: { stage: dto.stage },
    });
  }
}
