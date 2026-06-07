import { Body, Controller, Get, Patch, Post, Query, Sse } from '@nestjs/common';
import { Observable } from 'rxjs';
import { MessageEvent } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { Public } from '../../auth/decorators/public.decorator';
import { Roles } from '../../auth/decorators/roles.decorator';
import { PolicyAction, PolicyResource } from '../../auth/decorators/policy.decorator';
import { JwtUser } from '../../auth/jwt-user.interface';
import { SendTestMessageDto } from './dto/send-test-message.dto';
import { UpdateWhatsappSettingsDto } from './dto/update-whatsapp-settings.dto';
import { WhatsappConnectDto } from './dto/whatsapp-connect.dto';
import { WhatsappAdminService } from './whatsapp-admin.service';

@ApiTags('WhatsApp Admin')
@ApiBearerAuth('JWT')
@PolicyResource('WhatsappAdmin')
@Controller('admin/whatsapp')
export class WhatsappAdminController {
  constructor(private readonly whatsapp: WhatsappAdminService) {}

  @Get('status')
  @Roles('SUPERADMIN', 'ADMIN')
  @ApiOperation({ summary: 'Consultar status do robo WhatsApp' })
  status() {
    return this.whatsapp.status();
  }

  @Post('connect')
  @Roles('SUPERADMIN', 'ADMIN')
  @ApiOperation({ summary: 'Conectar ou gerar QR Code do WhatsApp' })
  connect(@CurrentUser() user: JwtUser, @Body() dto: WhatsappConnectDto) {
    return this.whatsapp.connect({ actor: user, force: dto.force });
  }

  @Post('restart')
  @Roles('SUPERADMIN', 'ADMIN')
  @ApiOperation({ summary: 'Reiniciar conexao do WhatsApp' })
  restart(@CurrentUser() user: JwtUser) {
    return this.whatsapp.restart(user);
  }

  @Post('logout')
  @Roles('SUPERADMIN', 'ADMIN')
  @ApiOperation({ summary: 'Desconectar WhatsApp e limpar sessao' })
  logout(@CurrentUser() user: JwtUser) {
    return this.whatsapp.logout(user);
  }

  @Get('qr')
  @Roles('SUPERADMIN', 'ADMIN')
  @ApiOperation({ summary: 'Consultar QR Code atual' })
  qr() {
    return this.whatsapp.qr();
  }

  @Get('logs')
  @Roles('SUPERADMIN', 'ADMIN')
  @ApiOperation({ summary: 'Listar eventos recentes da conexao' })
  logs() {
    return this.whatsapp.logs();
  }

  @Get('messages')
  @Roles('SUPERADMIN', 'ADMIN')
  @ApiOperation({ summary: 'Listar mensagens recentes do robo' })
  messages() {
    return this.whatsapp.messages();
  }

  @Get('metrics')
  @Roles('SUPERADMIN', 'ADMIN')
  @ApiOperation({ summary: 'Consultar metricas de mensagens do robo' })
  metrics() {
    return this.whatsapp.metrics();
  }

  @Get('settings')
  @Roles('SUPERADMIN', 'ADMIN')
  @ApiOperation({ summary: 'Consultar configuracoes do robo' })
  settings() {
    return this.whatsapp.settings();
  }

  @Patch('settings')
  @Roles('SUPERADMIN', 'ADMIN')
  @ApiOperation({ summary: 'Atualizar configuracoes do robo' })
  updateSettings(@CurrentUser() user: JwtUser, @Body() dto: UpdateWhatsappSettingsDto) {
    return this.whatsapp.updateSettings(user, dto);
  }

  @Post('test-message')
  @Roles('SUPERADMIN', 'ADMIN')
  @PolicyAction('send')
  @ApiOperation({ summary: 'Enviar mensagem de teste pelo WhatsApp conectado' })
  sendTestMessage(@CurrentUser() user: JwtUser, @Body() dto: SendTestMessageDto) {
    return this.whatsapp.sendTestMessage(user, dto);
  }

  @Public()
  @Sse('events')
  @ApiOperation({ summary: 'Stream SSE de eventos do WhatsApp' })
  events(@Query('token') token: string): Observable<MessageEvent> {
    return this.whatsapp.eventsForToken(token);
  }
}
