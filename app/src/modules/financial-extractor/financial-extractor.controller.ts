import { BadRequestException, Body, Controller, Post, UploadedFile, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Roles } from '../../auth/decorators/roles.decorator';
import { PolicyAction, PolicyResource } from '../../auth/decorators/policy.decorator';
import { Tenant } from '../../common/tenant/tenant.decorator';
import { PrismaService } from '../../common/prisma/prisma.service';
import { FinancialExtractorService } from './financial-extractor.service';
import { NormalizationService } from './normalization.service';

@PolicyResource('FinancialEntry')
@Controller('financial-extractor')
export class FinancialExtractorController {
  constructor(
    private readonly extractor: FinancialExtractorService,
    private readonly normalization: NormalizationService,
    private readonly prisma: PrismaService,
  ) {}

  @Roles('ADMIN', 'FINANCE', 'AGENT')
  @PolicyAction('create')
  @Post('receipt')
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: 8 * 1024 * 1024 } }))
  async receipt(
    @Tenant() tenantId: string,
    @UploadedFile() file: { buffer: Buffer; mimetype: string; originalname: string } | undefined,
    @Body('tipo') tipo = 'gasto',
  ) {
    if (!file) throw new BadRequestException('Arquivo do recibo nao enviado.');
    const extracted = await this.extractor.extract({
      tipo: tipo === 'receita' ? 'receita' : 'gasto',
      fileName: file.originalname,
      mimeType: file.mimetype,
      mediaBase64: file.buffer.toString('base64'),
    });
    const amountCents = this.normalization.moneyToCents(extracted.valor) ?? 0;
    const entry = await this.prisma.financialEntry.create({
      data: {
        tenantId,
        whatsappUserId: 'manual-upload',
        userWhatsapp: 'manual-upload',
        tipo: extracted.tipo,
        valorCents: amountCents,
        moeda: extracted.moeda,
        dataTransacao: this.parseDate(extracted.data_transacao),
        horaTransacao: this.value(extracted.hora_transacao),
        pagadorNome: this.value(extracted.pagador.nome),
        pagadorDocumento: this.value(extracted.pagador.documento),
        pagadorInstituicao: this.value(extracted.pagador.instituicao),
        recebedorNome: this.value(extracted.recebedor.nome),
        recebedorDocumento: this.value(extracted.recebedor.documento),
        recebedorInstituicao: this.value(extracted.recebedor.instituicao),
        chavePix: this.value(extracted.chave_pix),
        tipoTransferencia: this.value(extracted.tipo_transferencia),
        idTransacao: this.value(extracted.id_transacao),
        codigoAutenticacao: this.value(extracted.codigo_autenticacao),
        numeroControle: this.value(extracted.numero_controle),
        bancoEmissor: this.value(extracted.banco_emissor),
        situacao: this.value(extracted.situacao),
        descricao: extracted.descricao,
        confianca: extracted.confianca,
        fonteExtracao: extracted.fonte_extracao,
        arquivoUrl: file.originalname,
        jsonOriginal: JSON.stringify(extracted),
        status: 'pending_confirmation',
      },
    });
    return {
      entryId: entry.id,
      extracted,
      confidence: extracted.confianca,
      requiresConfirmation: true,
    };
  }

  @Roles('ADMIN', 'FINANCE', 'AGENT')
  @Post('test')
  test(@Body('text') text = '', @Body('tipo') tipo = 'gasto') {
    return this.extractor.extract({ text, tipo: tipo === 'receita' ? 'receita' : 'gasto' });
  }

  private value(input: string): string | null {
    return input && input !== 'nao identificado' ? input : null;
  }

  private parseDate(input: string): Date | null {
    if (!this.value(input)) return null;
    const date = new Date(`${input}T00:00:00.000Z`);
    return Number.isNaN(date.getTime()) ? null : date;
  }
}
