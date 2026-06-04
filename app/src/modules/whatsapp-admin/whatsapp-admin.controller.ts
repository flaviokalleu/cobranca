import { Body, Controller, Get, Post, Query, Sse } from '@nestjs/common';
import { Observable } from 'rxjs';
import { MessageEvent } from '@nestjs/common';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { Public } from '../../auth/decorators/public.decorator';
import { Roles } from '../../auth/decorators/roles.decorator';
import { JwtUser } from '../../auth/jwt-user.interface';
import { WhatsappConnectDto } from './dto/whatsapp-connect.dto';
import { WhatsappAdminService } from './whatsapp-admin.service';

@Controller('admin/whatsapp')
export class WhatsappAdminController {
  constructor(private readonly whatsapp: WhatsappAdminService) {}

  @Get('status')
  @Roles('SUPERADMIN', 'ADMIN')
  status() {
    return this.whatsapp.status();
  }

  @Post('connect')
  @Roles('SUPERADMIN', 'ADMIN')
  connect(@CurrentUser() user: JwtUser, @Body() dto: WhatsappConnectDto) {
    return this.whatsapp.connect({ actor: user, force: dto.force });
  }

  @Post('restart')
  @Roles('SUPERADMIN', 'ADMIN')
  restart(@CurrentUser() user: JwtUser) {
    return this.whatsapp.restart(user);
  }

  @Post('logout')
  @Roles('SUPERADMIN', 'ADMIN')
  logout(@CurrentUser() user: JwtUser) {
    return this.whatsapp.logout(user);
  }

  @Get('qr')
  @Roles('SUPERADMIN', 'ADMIN')
  qr() {
    return this.whatsapp.qr();
  }

  @Get('logs')
  @Roles('SUPERADMIN', 'ADMIN')
  logs() {
    return this.whatsapp.logs();
  }

  @Public()
  @Sse('events')
  events(@Query('token') token: string): Observable<MessageEvent> {
    return this.whatsapp.eventsForToken(token);
  }
}
