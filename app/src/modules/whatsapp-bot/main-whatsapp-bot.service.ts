import { Injectable, OnModuleInit } from '@nestjs/common';
import { WhatsappMessageHandler } from './whatsapp-message.handler';

@Injectable()
export class MainWhatsappBotService implements OnModuleInit {
  constructor(private readonly messages: WhatsappMessageHandler) {}

  onModuleInit(): void {
    this.messages.registerQueueHandlers();
  }

  async handleIncomingMessage(rawMessage: unknown): Promise<void> {
    await this.messages.handle(rawMessage as never);
  }
}
