import { Body, Controller, Get, Put } from '@nestjs/common';
import { SettingsService } from './settings.service';
import { UpdateSettingsDto } from './dto/update-settings.dto';
import { AuditService } from '../audit/audit.service';
import { Tenant } from '../tenant/tenant.decorator';
import { Roles } from '../../auth/decorators/roles.decorator';
import { PolicyResource } from '../../auth/decorators/policy.decorator';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { JwtUser } from '../../auth/jwt-user.interface';

@PolicyResource('Settings')
@Controller('settings')
export class SettingsController {
  constructor(
    private readonly settings: SettingsService,
    private readonly audit: AuditService,
  ) {}

  @Roles('ADMIN', 'AGENT')
  @Get()
  get(@Tenant() tenantId: string) {
    return this.settings.get(tenantId);
  }

  @Roles('ADMIN')
  @Put()
  async update(
    @Tenant() tenantId: string,
    @CurrentUser() user: JwtUser,
    @Body() dto: UpdateSettingsDto,
  ) {
    const result = await this.settings.upsert(tenantId, dto);
    await this.audit.record({
      tenantId,
      actor: user.email,
      action: 'SETTINGS_UPDATED',
      entityType: 'Settings',
      entityId: tenantId,
    });
    return result;
  }
}
