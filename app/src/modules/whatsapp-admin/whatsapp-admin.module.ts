import { Module } from '@nestjs/common';
import { WhatsappBotModule } from '../whatsapp-bot/whatsapp-bot.module';
import { WhatsappAdminController } from './whatsapp-admin.controller';
import { WhatsappAdminGateway } from './whatsapp-admin.gateway';
import { WhatsappAdminService } from './whatsapp-admin.service';
import { WhatsappCryptoService } from './whatsapp-crypto.service';
import { WhatsappPostgresAuthService } from './whatsapp-postgres-auth.service';

@Module({
  imports: [WhatsappBotModule],
  controllers: [WhatsappAdminController],
  providers: [
    WhatsappAdminGateway,
    WhatsappAdminService,
    WhatsappCryptoService,
    WhatsappPostgresAuthService,
  ],
  exports: [WhatsappAdminService],
})
export class WhatsappAdminModule {}
