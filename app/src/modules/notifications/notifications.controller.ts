import { Body, Controller, Delete, Get, Param, Patch, Post } from '@nestjs/common';
import { Roles } from '../../auth/decorators/roles.decorator';
import { Tenant } from '../../common/tenant/tenant.decorator';
import { CreateNotificationDto } from './dto/create-notification.dto';
import { UpdateNotificationDto } from './dto/update-notification.dto';
import { NotificationsService } from './notifications.service';

@Controller('notifications')
export class NotificationsController {
  constructor(private readonly notifications: NotificationsService) {}

  @Roles('ADMIN', 'FINANCE', 'COMMERCIAL', 'OPERATIONS', 'USER', 'AGENT')
  @Get()
  list(@Tenant() tenantId: string) {
    return this.notifications.list(tenantId);
  }

  @Roles('ADMIN', 'FINANCE', 'COMMERCIAL', 'OPERATIONS', 'AGENT')
  @Post()
  create(@Tenant() tenantId: string, @Body() dto: CreateNotificationDto) {
    return this.notifications.create(tenantId, dto);
  }

  @Roles('ADMIN', 'FINANCE', 'COMMERCIAL', 'OPERATIONS', 'USER', 'AGENT')
  @Patch(':id/read')
  markRead(@Tenant() tenantId: string, @Param('id') id: string) {
    return this.notifications.markRead(tenantId, id);
  }

  @Roles('ADMIN', 'FINANCE', 'COMMERCIAL', 'OPERATIONS', 'AGENT')
  @Patch(':id')
  update(
    @Tenant() tenantId: string,
    @Param('id') id: string,
    @Body() dto: UpdateNotificationDto,
  ) {
    return this.notifications.update(tenantId, id, dto);
  }

  @Roles('ADMIN', 'FINANCE', 'COMMERCIAL', 'OPERATIONS')
  @Delete(':id')
  remove(@Tenant() tenantId: string, @Param('id') id: string) {
    return this.notifications.remove(tenantId, id);
  }
}
