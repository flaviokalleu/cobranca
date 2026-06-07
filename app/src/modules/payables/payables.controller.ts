import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { PayablesService } from './payables.service';
import { CreatePayableDto } from './dto/create-payable.dto';
import { UpdatePayableDto } from './dto/update-payable.dto';
import { Tenant } from '../../common/tenant/tenant.decorator';
import { Roles } from '../../auth/decorators/roles.decorator';
import { PolicyAction, PolicyResource } from '../../auth/decorators/policy.decorator';
import { PaginationDto } from '../../common/dto/pagination.dto';

@ApiTags('Contas a pagar')
@ApiBearerAuth('JWT')
@PolicyResource('Payable')
@Controller('payables')
export class PayablesController {
  constructor(private readonly payables: PayablesService) {}

  @Roles('ADMIN', 'FINANCE', 'AGENT')
  @ApiOperation({ summary: 'Criar conta a pagar' })
  @Post()
  create(@Tenant() tenantId: string, @Body() dto: CreatePayableDto) {
    return this.payables.create(tenantId, dto);
  }

  @Roles('ADMIN', 'FINANCE', 'AGENT')
  @ApiOperation({ summary: 'Listar contas a pagar' })
  @Get()
  list(@Tenant() tenantId: string, @Query() query: PaginationDto) {
    return this.payables.list(tenantId, query);
  }

  @Roles('ADMIN', 'FINANCE')
  @PolicyAction('pay')
  @ApiOperation({ summary: 'Marcar conta a pagar como paga' })
  @Post(':id/pay')
  pay(@Tenant() tenantId: string, @Param('id') id: string) {
    return this.payables.pay(tenantId, id);
  }

  @Roles('ADMIN', 'FINANCE', 'AGENT')
  @ApiOperation({ summary: 'Atualizar conta a pagar' })
  @Patch(':id')
  update(
    @Tenant() tenantId: string,
    @Param('id') id: string,
    @Body() dto: UpdatePayableDto,
  ) {
    return this.payables.update(tenantId, id, dto);
  }

  @Roles('ADMIN', 'FINANCE')
  @ApiOperation({ summary: 'Excluir conta a pagar' })
  @Delete(':id')
  remove(@Tenant() tenantId: string, @Param('id') id: string) {
    return this.payables.remove(tenantId, id);
  }
}
