import { Body, Controller, Get, Param, Patch, Post } from '@nestjs/common';
import { TasksService } from './tasks.service';
import { CreateTaskDto } from './dto/create-task.dto';
import { Tenant } from '../../common/tenant/tenant.decorator';
import { Roles } from '../../auth/decorators/roles.decorator';

@Controller('tasks')
export class TasksController {
  constructor(private readonly tasks: TasksService) {}

  @Roles('ADMIN', 'FINANCE', 'COMMERCIAL', 'OPERATIONS', 'USER', 'AGENT')
  @Post()
  create(@Tenant() tenantId: string, @Body() dto: CreateTaskDto) {
    return this.tasks.create(tenantId, dto);
  }

  @Roles('ADMIN', 'FINANCE', 'COMMERCIAL', 'OPERATIONS', 'USER', 'AGENT')
  @Get()
  list(@Tenant() tenantId: string) {
    return this.tasks.list(tenantId);
  }

  @Roles('ADMIN', 'FINANCE', 'COMMERCIAL', 'OPERATIONS', 'USER', 'AGENT')
  @Patch(':id/toggle')
  toggle(@Tenant() tenantId: string, @Param('id') id: string) {
    return this.tasks.toggle(tenantId, id);
  }
}
