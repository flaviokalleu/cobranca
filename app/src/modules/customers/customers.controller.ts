import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Res,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Response } from 'express';
import { CustomersService } from './customers.service';
import { CreateCustomerDto } from './dto/create-customer.dto';
import { UpdateCustomerDto } from './dto/update-customer.dto';
import { Tenant } from '../../common/tenant/tenant.decorator';
import { Roles } from '../../auth/decorators/roles.decorator';
import { PolicyAction, PolicyResource } from '../../auth/decorators/policy.decorator';
import { PaginationDto } from '../../common/dto/pagination.dto';
import { BulkActionDto } from '../../common/dto/bulk-action.dto';

@ApiTags('Clientes')
@ApiBearerAuth('JWT')
@PolicyResource('Customer')
@Controller('customers')
export class CustomersController {
  constructor(private readonly customers: CustomersService) {}

  @Roles('ADMIN', 'COMMERCIAL', 'OPERATIONS', 'AGENT')
  @ApiOperation({ summary: 'Criar cliente ou lead' })
  @Post()
  create(@Tenant() tenantId: string, @Body() dto: CreateCustomerDto) {
    return this.customers.create(tenantId, dto);
  }

  @Roles('ADMIN', 'COMMERCIAL', 'OPERATIONS', 'USER', 'AGENT')
  @ApiOperation({ summary: 'Listar clientes do tenant' })
  @Get()
  list(@Tenant() tenantId: string, @Query() query: PaginationDto) {
    return this.customers.list(tenantId, query);
  }

  @Roles('ADMIN', 'COMMERCIAL', 'OPERATIONS')
  @PolicyAction('export')
  @ApiOperation({ summary: 'Exportar clientes em CSV' })
  @Get('export')
  async exportCsv(@Tenant() tenantId: string, @Res() res: Response) {
    const csv = await this.customers.exportCsv(tenantId);
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="clientes.csv"');
    res.send('\uFEFF' + csv);
  }

  @Roles('ADMIN', 'COMMERCIAL', 'OPERATIONS')
  @PolicyAction('import')
  @ApiOperation({ summary: 'Importar clientes via CSV' })
  @Post('import')
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: 5 * 1024 * 1024 } }))
  importCsv(
    @Tenant() tenantId: string,
    @UploadedFile() file: { buffer: Buffer; originalname: string } | undefined,
  ) {
    if (!file) throw new BadRequestException('Arquivo CSV nao enviado.');
    return this.customers.importCsv(tenantId, file.buffer.toString('utf-8'));
  }

  @Roles('ADMIN', 'COMMERCIAL', 'OPERATIONS', 'USER', 'AGENT')
  @ApiOperation({ summary: 'Detalhar cliente' })
  @Get(':id')
  get(@Tenant() tenantId: string, @Param('id') id: string) {
    return this.customers.get(tenantId, id);
  }

  @Roles('ADMIN')
  @PolicyAction('delete')
  @ApiOperation({ summary: 'Excluir clientes em lote' })
  @Delete('bulk')
  bulkRemove(@Tenant() tenantId: string, @Body() dto: BulkActionDto) {
    return this.customers.bulkRemove(tenantId, dto.ids);
  }

  @Roles('ADMIN', 'COMMERCIAL', 'OPERATIONS', 'AGENT')
  @ApiOperation({ summary: 'Atualizar cliente' })
  @Patch(':id')
  update(
    @Tenant() tenantId: string,
    @Param('id') id: string,
    @Body() dto: UpdateCustomerDto,
  ) {
    return this.customers.update(tenantId, id, dto);
  }

  // Exclusao e destrutiva: somente ADMIN.
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Excluir cliente' })
  @Delete(':id')
  remove(@Tenant() tenantId: string, @Param('id') id: string) {
    return this.customers.remove(tenantId, id);
  }
}
