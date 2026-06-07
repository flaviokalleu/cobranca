import { Controller, Get } from '@nestjs/common';
import { AuditService } from './audit.service';
import { Tenant } from '../tenant/tenant.decorator';
import { Roles } from '../../auth/decorators/roles.decorator';
import { PolicyResource } from '../../auth/decorators/policy.decorator';

@PolicyResource('Audit')
@Controller('audit')
export class AuditController {
  constructor(private readonly audit: AuditService) {}

  /// Log de atividade do tenant (somente ADMIN).
  @Roles('ADMIN')
  @Get()
  list(@Tenant() tenantId: string) {
    return this.audit.list(tenantId);
  }
}
