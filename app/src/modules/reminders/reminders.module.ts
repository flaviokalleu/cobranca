import { Module } from '@nestjs/common';
import { ReminderProcessor } from './reminder.processor';
import { RemindersScheduler } from './reminders.scheduler';
import { RemindersController } from './reminders.controller';
import {
  ReminderSender,
  ConsoleReminderSender,
} from './reminder-sender';
import { BaileysReminderSender } from './baileys-reminder.sender';

// console (padrao) ou baileys (WhatsApp real). Trocado por env REMINDER_SENDER.
const SenderImpl =
  process.env.REMINDER_SENDER === 'baileys'
    ? BaileysReminderSender
    : ConsoleReminderSender;

@Module({
  controllers: [RemindersController],
  providers: [
    ReminderProcessor,
    RemindersScheduler,
    { provide: ReminderSender, useClass: SenderImpl },
  ],
})
export class RemindersModule {}
