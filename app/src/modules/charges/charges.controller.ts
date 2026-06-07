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
import { ChargesService } from './charges.service';
import { CreateChargeDto } from './dto/create-charge.dto';
import { UpdateChargeDto } from './dto/update-charge.dto';
import { Tenant } from '../../common/tenant/tenant.decorator';
import { Roles } from '../../auth/decorators/roles.decorator';
import { PolicyAction, PolicyResource } from '../../auth/decorators/policy.decorator';
import { PaginationDto } from '../../common/dto/pagination.dto';
import { BulkActionDto } from '../../common/dto/bulk-action.dto';

@ApiTags('Cobranças')
@ApiBearerAuth('JWT')
@PolicyResource('Charge')
@Controller('charges')
export class ChargesController {
  constructor(private readonly charges: ChargesService) {}

  @Roles('ADMIN', 'FINANCE', 'COMMERCIAL', 'AGENT')
  @ApiOperation({ summary: 'Criar cobranca' })
  @Post()
  create(@Tenant() tenantId: string, @Body() dto: CreateChargeDto) {
    return this.charges.create(tenantId, dto);
  }

  @Roles('ADMIN', 'FINANCE', 'COMMERCIAL', 'OPERATIONS', 'AGENT')
  @ApiOperation({ summary: 'Listar cobrancas do tenant' })
  @Get()
  list(@Tenant() tenantId: string, @Query() query: PaginationDto) {
    return this.charges.list(tenantId, query);
  }

  @Roles('ADMIN', 'FINANCE', 'COMMERCIAL')
  @PolicyAction('export')
  @ApiOperation({ summary: 'Exportar cobrancas em CSV' })
  @Get('export')
  async exportCsv(@Tenant() tenantId: string, @Res() res: Response) {
    const csv = await this.charges.exportCsv(tenantId);
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="cobrancas.csv"');
    res.send('\uFEFF' + csv);
  }

  @Roles('ADMIN', 'FINANCE', 'COMMERCIAL')
  @PolicyAction('import')
  @ApiOperation({ summary: 'Importar cobrancas via CSV' })
  @Post('import')
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: 5 * 1024 * 1024 } }))
  importCsv(
    @Tenant() tenantId: string,
    @UploadedFile() file: { buffer: Buffer; originalname: string } | undefined,
  ) {
    if (!file) throw new BadRequestException('Arquivo CSV nao enviado.');
    return this.charges.importCsv(tenantId, file.buffer.toString('utf-8'));
  }

  @Roles('ADMIN', 'FINANCE', 'COMMERCIAL', 'AGENT')
  @ApiOperation({ summary: 'Listar proximas cobrancas mensais' })
  @Get('upcoming')
  upcoming(@Tenant() tenantId: string) {
    return this.charges.upcoming(tenantId);
  }

  @Roles('ADMIN', 'FINANCE')
  @PolicyAction('create')
  @ApiOperation({ summary: 'Gerar cobrancas mensais vencidas' })
  @Post('generate-monthly')
  generateMonthly(@Tenant() tenantId: string) {
    return this.charges.generateMonthlyDueCharges(new Date(), tenantId);
  }

  @Roles('ADMIN', 'FINANCE', 'COMMERCIAL', 'OPERATIONS', 'AGENT')
  @ApiOperation({ summary: 'Detalhar cobranca' })
  @Get(':id')
  get(@Tenant() tenantId: string, @Param('id') id: string) {
    return this.charges.get(tenantId, id);
  }

  @Roles('ADMIN', 'FINANCE')
  @PolicyAction('update')
  @ApiOperation({ summary: 'Acoes em lote para cobrancas' })
  @Patch('bulk')
  bulk(@Tenant() tenantId: string, @Body() dto: BulkActionDto) {
    return this.charges.bulk(tenantId, dto.ids, dto.action);
  }

  @Roles('ADMIN', 'FINANCE', 'COMMERCIAL', 'AGENT')
  @ApiOperation({ summary: 'Obter codigo PIX da cobranca' })
  @Get(':id/pix')
  pix(@Tenant() tenantId: string, @Param('id') id: string) {
    return this.charges.getPix(tenantId, id);
  }

  @Roles('ADMIN', 'FINANCE', 'COMMERCIAL', 'AGENT')
  @PolicyAction('send')
  @ApiOperation({ summary: 'Enviar lembrete de cobranca pelo WhatsApp' })
  @Post(':id/whatsapp-reminder')
  sendWhatsappReminder(@Tenant() tenantId: string, @Param('id') id: string) {
    return this.charges.sendWhatsappReminder(tenantId, id);
  }

  @Roles('ADMIN', 'FINANCE', 'COMMERCIAL', 'AGENT')
  @PolicyAction('create')
  @ApiOperation({ summary: 'Duplicar cobranca' })
  @Post(':id/duplicate')
  duplicate(@Tenant() tenantId: string, @Param('id') id: string) {
    return this.charges.duplicate(tenantId, id);
  }

  @Roles('ADMIN', 'FINANCE', 'COMMERCIAL', 'AGENT')
  @PolicyAction('send')
  @ApiOperation({ summary: 'Enviar PIX da cobranca pelo WhatsApp' })
  @Post(':id/send-pix-whatsapp')
  sendPixWhatsapp(@Tenant() tenantId: string, @Param('id') id: string) {
    return this.charges.sendPixWhatsapp(tenantId, id);
  }

  // Baixa de pagamento e acao sensivel: somente ADMIN.
  @Roles('ADMIN', 'FINANCE')
  @PolicyAction('pay')
  @ApiOperation({ summary: 'Marcar cobranca como paga' })
  @Post(':id/pay')
  pay(@Tenant() tenantId: string, @Param('id') id: string) {
    return this.charges.pay(tenantId, id);
  }

  @Roles('ADMIN', 'FINANCE', 'COMMERCIAL', 'AGENT')
  @ApiOperation({ summary: 'Atualizar cobranca' })
  @Patch(':id')
  update(
    @Tenant() tenantId: string,
    @Param('id') id: string,
    @Body() dto: UpdateChargeDto,
  ) {
    return this.charges.update(tenantId, id, dto);
  }

  @Roles('ADMIN', 'FINANCE')
  @ApiOperation({ summary: 'Excluir cobranca' })
  @Delete(':id')
  remove(@Tenant() tenantId: string, @Param('id') id: string) {
    return this.charges.remove(tenantId, id);
  }
}
