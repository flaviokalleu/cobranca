import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { TasksService } from './tasks.service';
import { CreateTaskDto } from './dto/create-task.dto';
import { UpdateTaskDto } from './dto/update-task.dto';
import { Tenant } from '../../common/tenant/tenant.decorator';
import { Roles } from '../../auth/decorators/roles.decorator';
import { PolicyResource } from '../../auth/decorators/policy.decorator';
import { PaginationDto } from '../../common/dto/pagination.dto';
import { BulkActionDto } from '../../common/dto/bulk-action.dto';

@PolicyResource('Task')
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
  list(@Tenant() tenantId: string, @Query() query: PaginationDto) {
    return this.tasks.list(tenantId, query);
  }

  @Roles('ADMIN', 'FINANCE', 'COMMERCIAL', 'OPERATIONS', 'USER', 'AGENT')
  @Get(':id')
  get(@Tenant() tenantId: string, @Param('id') id: string) {
    return this.tasks.get(tenantId, id);
  }

  @Roles('ADMIN', 'FINANCE', 'COMMERCIAL', 'OPERATIONS', 'USER', 'AGENT')
  @Post(':id/subtasks')
  addSubtask(@Tenant() tenantId: string, @Param('id') id: string, @Body() dto: CreateTaskDto) {
    return this.tasks.addSubtask(tenantId, id, dto);
  }

  @Roles('ADMIN', 'FINANCE', 'COMMERCIAL', 'OPERATIONS', 'USER', 'AGENT')
  @Patch('bulk')
  bulk(@Tenant() tenantId: string, @Body() dto: BulkActionDto) {
    return this.tasks.bulk(tenantId, dto.ids, dto.action, dto.assignee);
  }

  @Roles('ADMIN', 'FINANCE', 'COMMERCIAL', 'OPERATIONS', 'USER', 'AGENT')
  @Patch(':id/toggle')
  toggle(@Tenant() tenantId: string, @Param('id') id: string) {
    return this.tasks.toggle(tenantId, id);
  }

  @Roles('ADMIN', 'FINANCE', 'COMMERCIAL', 'OPERATIONS', 'USER', 'AGENT')
  @Patch(':id')
  update(
    @Tenant() tenantId: string,
    @Param('id') id: string,
    @Body() dto: UpdateTaskDto,
  ) {
    return this.tasks.update(tenantId, id, dto);
  }

  @Roles('ADMIN', 'FINANCE', 'COMMERCIAL', 'OPERATIONS', 'USER', 'AGENT')
  @Delete(':id')
  remove(@Tenant() tenantId: string, @Param('id') id: string) {
    return this.tasks.remove(tenantId, id);
  }
}
