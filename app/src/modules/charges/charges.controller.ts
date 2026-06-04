import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { ChargesService } from './charges.service';
import { CreateChargeDto } from './dto/create-charge.dto';
import { Tenant } from '../../common/tenant/tenant.decorator';
import { Roles } from '../../auth/decorators/roles.decorator';

@Controller('charges')
export class ChargesController {
  constructor(private readonly charges: ChargesService) {}

  @Roles('ADMIN', 'AGENT')
  @Post()
  create(@Tenant() tenantId: string, @Body() dto: CreateChargeDto) {
    return this.charges.create(tenantId, dto);
  }

  @Roles('ADMIN', 'AGENT')
  @Get()
  list(@Tenant() tenantId: string) {
    return this.charges.list(tenantId);
  }

  @Roles('ADMIN', 'AGENT')
  @Get(':id/pix')
  pix(@Tenant() tenantId: string, @Param('id') id: string) {
    return this.charges.getPix(tenantId, id);
  }

  // Baixa de pagamento e acao sensivel: somente ADMIN.
  @Roles('ADMIN')
  @Post(':id/pay')
  pay(@Tenant() tenantId: string, @Param('id') id: string) {
    return this.charges.pay(tenantId, id);
  }
}
