import { Controller, Post } from '@nestjs/common';
import { RemindersScheduler } from './reminders.scheduler';
import { Roles } from '../../auth/decorators/roles.decorator';

@Controller('admin/reminders')
export class RemindersController {
  constructor(private readonly scheduler: RemindersScheduler) {}

  /// Dispara manualmente a varredura de lembretes (somente ADMIN).
  @Roles('ADMIN')
  @Post('run')
  async run() {
    const enqueued = await this.scheduler.enqueueDue();
    return { enqueued };
  }
}
