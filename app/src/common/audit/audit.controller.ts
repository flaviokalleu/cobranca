import { Controller, Get } from '@nestjs/common';
import { AuditService } from './audit.service';
import { Tenant } from '../tenant/tenant.decorator';
import { Roles } from '../../auth/decorators/roles.decorator';

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
