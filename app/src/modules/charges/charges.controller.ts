import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
} from '@nestjs/common';
import { ChargesService } from './charges.service';
import { CreateChargeDto } from './dto/create-charge.dto';
import { UpdateChargeDto } from './dto/update-charge.dto';
import { Tenant } from '../../common/tenant/tenant.decorator';
import { Roles } from '../../auth/decorators/roles.decorator';

@Controller('charges')
export class ChargesController {
  constructor(private readonly charges: ChargesService) {}

  @Roles('ADMIN', 'FINANCE', 'COMMERCIAL', 'AGENT')
  @Post()
  create(@Tenant() tenantId: string, @Body() dto: CreateChargeDto) {
    return this.charges.create(tenantId, dto);
  }

  @Roles('ADMIN', 'FINANCE', 'COMMERCIAL', 'OPERATIONS', 'AGENT')
  @Get()
  list(@Tenant() tenantId: string) {
    return this.charges.list(tenantId);
  }

  @Roles('ADMIN', 'FINANCE', 'COMMERCIAL', 'AGENT')
  @Get(':id/pix')
  pix(@Tenant() tenantId: string, @Param('id') id: string) {
    return this.charges.getPix(tenantId, id);
  }

  @Roles('ADMIN', 'FINANCE', 'COMMERCIAL', 'AGENT')
  @Post(':id/whatsapp-reminder')
  sendWhatsappReminder(@Tenant() tenantId: string, @Param('id') id: string) {
    return this.charges.sendWhatsappReminder(tenantId, id);
  }

  // Baixa de pagamento e acao sensivel: somente ADMIN.
  @Roles('ADMIN', 'FINANCE')
  @Post(':id/pay')
  pay(@Tenant() tenantId: string, @Param('id') id: string) {
    return this.charges.pay(tenantId, id);
  }

  @Roles('ADMIN', 'FINANCE', 'COMMERCIAL', 'AGENT')
  @Patch(':id')
  update(
    @Tenant() tenantId: string,
    @Param('id') id: string,
    @Body() dto: UpdateChargeDto,
  ) {
    return this.charges.update(tenantId, id, dto);
  }

  @Roles('ADMIN', 'FINANCE')
  @Delete(':id')
  remove(@Tenant() tenantId: string, @Param('id') id: string) {
    return this.charges.remove(tenantId, id);
  }
}
