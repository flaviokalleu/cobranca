import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { AuditService } from '../../common/audit/audit.service';

@Injectable()
export class BillingService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  plans() {
    return this.prisma.plan.findMany({ orderBy: { priceCents: 'asc' } });
  }

  subscription(tenantId: string) {
    return this.prisma.subscription.findFirst({ where: { tenantId } });
  }

  /// Troca de plano. Billing real (Asaas da plataforma) entra na Onda C; aqui simula ativacao.
  async changePlan(tenantId: string, planCode: string) {
    const plan = await this.prisma.plan.findUnique({ where: { code: planCode } });
    if (!plan) throw new NotFoundException('Plano inexistente.');
    const currentPeriodEnd = new Date(Date.now() + 30 * 86_400_000);
    const existing = await this.prisma.subscription.findFirst({ where: { tenantId } });
    const sub = existing
      ? await this.prisma.subscription.update({
          where: { id: existing.id },
          data: { planCode, status: 'ACTIVE', currentPeriodEnd },
        })
      : await this.prisma.subscription.create({
          data: { tenantId, planCode, status: 'ACTIVE', currentPeriodEnd },
        });
    await this.audit.record({
      tenantId,
      actor: 'system',
      action: 'SUBSCRIPTION_CHANGED',
      entityType: 'Subscription',
      entityId: sub.id,
      metadata: { planCode },
    });
    return sub;
  }
}
