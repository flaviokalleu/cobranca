import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../../common/prisma/prisma.service';
import { QueueService } from '../../common/queue/queue.service';
import { REMINDER_JOB, ReminderJobPayload } from './reminder.types';

/// Agendador: todo dia varre cobrancas a vencer/vencidas e enfileira lembretes.
@Injectable()
export class RemindersScheduler {
  private readonly logger = new Logger('RemindersScheduler');

  constructor(
    private readonly prisma: PrismaService,
    private readonly queue: QueueService,
  ) {}

  @Cron(CronExpression.EVERY_DAY_AT_9AM)
  async runDaily(): Promise<void> {
    const count = await this.enqueueDue();
    this.logger.log(`Lembretes diarios enfileirados: ${count}`);
  }

  /**
   * Enfileira lembretes para cobrancas PENDING que vencem em ate 3 dias
   * (ou ja vencidas). Varre todos os tenants — e um job de sistema.
   */
  async enqueueDue(): Promise<number> {
    const limit = new Date();
    limit.setDate(limit.getDate() + 3);

    const charges = await this.prisma.charge.findMany({
      where: { status: 'PENDING', dueDate: { lte: limit } },
      include: { customer: true },
    });

    for (const charge of charges) {
      const payload: ReminderJobPayload = {
        tenantId: charge.tenantId,
        chargeId: charge.id,
        customerName: charge.customer.name,
        phone: charge.customer.phone,
        amountCents: charge.amountCents,
        dueDate: charge.dueDate.toISOString(),
      };
      this.queue.enqueue(REMINDER_JOB, payload);
    }
    return charges.length;
  }
}
