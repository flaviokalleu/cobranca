import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { ChargesService } from './charges.service';

@Injectable()
export class ChargesScheduler {
  private readonly logger = new Logger(ChargesScheduler.name);

  constructor(private readonly charges: ChargesService) {}

  @Cron('0 8 * * *')
  async generateMonthlyCharges() {
    const result = await this.charges.generateMonthlyDueCharges();
    if (result.generated > 0) {
      this.logger.log(`Geradas ${result.generated} cobrancas mensais.`);
    }
  }
}
