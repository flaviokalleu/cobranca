import { Body, Controller, Delete, Get, Param, Patch, Post } from '@nestjs/common';
import { Roles } from '../../auth/decorators/roles.decorator';
import { PolicyResource } from '../../auth/decorators/policy.decorator';
import { Tenant } from '../../common/tenant/tenant.decorator';
import { AccountPlanService } from './account-plan.service';
import { CreateAccountPlanDto, UpdateAccountPlanDto } from './dto/account-plan.dto';

@PolicyResource('AccountPlan')
@Controller('account-plan')
export class AccountPlanController {
  constructor(private readonly accounts: AccountPlanService) {}

  @Roles('ADMIN', 'FINANCE')
  @Get()
  list(@Tenant() tenantId: string) {
    return this.accounts.list(tenantId);
  }

  @Roles('ADMIN', 'FINANCE')
  @Post()
  create(@Tenant() tenantId: string, @Body() dto: CreateAccountPlanDto) {
    return this.accounts.create(tenantId, dto);
  }

  @Roles('ADMIN', 'FINANCE')
  @Patch(':code')
  update(@Tenant() tenantId: string, @Param('code') code: string, @Body() dto: UpdateAccountPlanDto) {
    return this.accounts.updateByCode(tenantId, code, dto);
  }

  @Roles('ADMIN', 'FINANCE')
  @Delete(':code')
  remove(@Tenant() tenantId: string, @Param('code') code: string) {
    return this.accounts.removeByCode(tenantId, code);
  }

  @Roles('ADMIN', 'FINANCE')
  @Post('seed-default')
  seed(@Tenant() tenantId: string) {
    return this.accounts.seedDefault(tenantId);
  }
}
