import { Body, Controller, Delete, Get, MessageEvent, Param, Patch, Post, Query, Sse } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Observable } from 'rxjs';
import { Roles } from '../../auth/decorators/roles.decorator';
import { PolicyResource } from '../../auth/decorators/policy.decorator';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { JwtUser } from '../../auth/jwt-user.interface';
import { Tenant } from '../../common/tenant/tenant.decorator';
import { PaginationDto } from '../../common/dto/pagination.dto';
import { CreateNotificationDto } from './dto/create-notification.dto';
import { UpdateNotificationDto } from './dto/update-notification.dto';
import { NotificationsService } from './notifications.service';

@ApiTags('Notificações')
@ApiBearerAuth('JWT')
@PolicyResource('Notification')
@Controller('notifications')
export class NotificationsController {
  constructor(private readonly notifications: NotificationsService) {}

  @Roles('ADMIN', 'FINANCE', 'COMMERCIAL', 'OPERATIONS', 'USER', 'AGENT')
  @ApiOperation({ summary: 'Listar notificacoes' })
  @Get()
  list(@Tenant() tenantId: string, @Query() query: PaginationDto) {
    return this.notifications.list(tenantId, query);
  }

  @Roles('ADMIN', 'FINANCE', 'COMMERCIAL', 'OPERATIONS', 'USER', 'AGENT')
  @ApiOperation({ summary: 'Stream em tempo real de notificacoes do tenant' })
  @Sse('stream')
  stream(@CurrentUser() user: JwtUser): Observable<MessageEvent> {
    return this.notifications.stream(user);
  }

  @Roles('ADMIN', 'FINANCE', 'COMMERCIAL', 'OPERATIONS', 'AGENT')
  @ApiOperation({ summary: 'Criar notificacao' })
  @Post()
  create(@Tenant() tenantId: string, @Body() dto: CreateNotificationDto) {
    return this.notifications.create(tenantId, dto);
  }

  @Roles('ADMIN', 'FINANCE', 'COMMERCIAL', 'OPERATIONS', 'USER', 'AGENT')
  @ApiOperation({ summary: 'Marcar notificacao como lida' })
  @Patch(':id/read')
  markRead(@Tenant() tenantId: string, @Param('id') id: string) {
    return this.notifications.markRead(tenantId, id);
  }

  @Roles('ADMIN', 'FINANCE', 'COMMERCIAL', 'OPERATIONS', 'AGENT')
  @ApiOperation({ summary: 'Atualizar notificacao' })
  @Patch(':id')
  update(
    @Tenant() tenantId: string,
    @Param('id') id: string,
    @Body() dto: UpdateNotificationDto,
  ) {
    return this.notifications.update(tenantId, id, dto);
  }

  @Roles('ADMIN', 'FINANCE', 'COMMERCIAL', 'OPERATIONS')
  @ApiOperation({ summary: 'Excluir notificacao' })
  @Delete(':id')
  remove(@Tenant() tenantId: string, @Param('id') id: string) {
    return this.notifications.remove(tenantId, id);
  }
}
