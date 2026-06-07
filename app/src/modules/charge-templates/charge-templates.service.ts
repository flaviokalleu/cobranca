import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { AuditService } from '../../common/audit/audit.service';
import { ChargesService } from '../charges/charges.service';
import { ApplyChargeTemplateDto, CreateChargeTemplateDto, UpdateChargeTemplateDto } from './dto/charge-template.dto';

@Injectable()
export class ChargeTemplatesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly charges: ChargesService,
  ) {}

  list(tenantId: string) {
    return this.prisma.chargeTemplate.findMany({ where: { tenantId }, orderBy: { createdAt: 'desc' } });
  }

  async create(tenantId: string, dto: CreateChargeTemplateDto) {
    const template = await this.prisma.chargeTemplate.create({
      data: {
        tenantId,
        name: dto.name,
        description: dto.description,
        amountCents: dto.amountCents,
        recurrence: dto.recurrence ?? 'ONCE',
        daysUntilDue: dto.daysUntilDue ?? 30,
        category: dto.category ?? null,
      },
    });
    await this.audit.record({ tenantId, actor: 'system', action: 'CHARGE_TEMPLATE_CREATED', entityType: 'ChargeTemplate', entityId: template.id });
    return template;
  }

  async update(tenantId: string, id: string, dto: UpdateChargeTemplateDto) {
    await this.ensure(tenantId, id);
    const template = await this.prisma.chargeTemplate.update({
      where: { id },
      data: {
        name: dto.name,
        description: dto.description,
        amountCents: dto.amountCents,
        recurrence: dto.recurrence,
        daysUntilDue: dto.daysUntilDue,
        category: dto.category,
      },
    });
    await this.audit.record({ tenantId, actor: 'system', action: 'CHARGE_TEMPLATE_UPDATED', entityType: 'ChargeTemplate', entityId: id });
    return template;
  }

  async remove(tenantId: string, id: string) {
    await this.ensure(tenantId, id);
    await this.prisma.chargeTemplate.delete({ where: { id } });
    await this.audit.record({ tenantId, actor: 'system', action: 'CHARGE_TEMPLATE_DELETED', entityType: 'ChargeTemplate', entityId: id });
    return { ok: true };
  }

  async apply(tenantId: string, id: string, dto: ApplyChargeTemplateDto) {
    const template = await this.ensure(tenantId, id);
    const dueDate = dto.dueAt ? new Date(dto.dueAt) : this.addDays(new Date(), template.daysUntilDue);
    return this.charges.create(tenantId, {
      customerId: dto.customerId,
      amountCents: template.amountCents,
      description: template.description,
      dueDate: dueDate.toISOString(),
      category: template.category ?? undefined,
      recurrence: template.recurrence,
    });
  }

  private async ensure(tenantId: string, id: string) {
    const template = await this.prisma.chargeTemplate.findFirst({ where: { tenantId, id } });
    if (!template) throw new NotFoundException('Template nao encontrado.');
    return template;
  }

  private addDays(date: Date, days: number) {
    const copy = new Date(date);
    copy.setDate(copy.getDate() + days);
    return copy;
  }
}
