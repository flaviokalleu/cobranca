import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { Roles } from '../../auth/decorators/roles.decorator';
import { Tenant } from '../../common/tenant/tenant.decorator';
import { CalendarService } from './calendar.service';
import { CreateCalendarEventDto } from './dto/create-calendar-event.dto';
import { UpdateCalendarEventStatusDto } from './dto/update-calendar-event-status.dto';
import { UpdateCalendarEventDto } from './dto/update-calendar-event.dto';

@Controller('calendar')
export class CalendarController {
  constructor(private readonly calendar: CalendarService) {}

  @Roles('ADMIN', 'FINANCE', 'COMMERCIAL', 'OPERATIONS', 'USER', 'AGENT')
  @Get('events')
  list(
    @Tenant() tenantId: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    return this.calendar.list(tenantId, from, to);
  }

  @Roles('ADMIN', 'FINANCE', 'COMMERCIAL', 'OPERATIONS', 'AGENT')
  @Post('events')
  create(@Tenant() tenantId: string, @Body() dto: CreateCalendarEventDto) {
    return this.calendar.create(tenantId, dto);
  }

  @Roles('ADMIN', 'FINANCE', 'COMMERCIAL', 'OPERATIONS', 'AGENT')
  @Patch('events/:id/status')
  updateStatus(
    @Tenant() tenantId: string,
    @Param('id') id: string,
    @Body() dto: UpdateCalendarEventStatusDto,
  ) {
    return this.calendar.updateStatus(tenantId, id, dto);
  }

  @Roles('ADMIN', 'FINANCE', 'COMMERCIAL', 'OPERATIONS', 'AGENT')
  @Patch('events/:id')
  update(
    @Tenant() tenantId: string,
    @Param('id') id: string,
    @Body() dto: UpdateCalendarEventDto,
  ) {
    return this.calendar.update(tenantId, id, dto);
  }

  @Roles('ADMIN', 'FINANCE', 'COMMERCIAL', 'OPERATIONS')
  @Delete('events/:id')
  remove(@Tenant() tenantId: string, @Param('id') id: string) {
    return this.calendar.remove(tenantId, id);
  }
}
