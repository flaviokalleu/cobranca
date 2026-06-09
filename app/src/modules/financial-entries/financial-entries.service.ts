import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { UpdateFinancialEntryDto } from './dto/update-financial-entry.dto';
import { AuditService } from '../../common/audit/audit.service';
import { ExtractedTransactionDto } from '../financial-extractor/dto/extracted-transaction.dto';
import { NormalizationService } from '../financial-extractor/normalization.service';
import { FinancialEntriesRepository } from './financial-entries.repository';
import { ListFinancialEntryDto } from './dto/list-financial-entry.dto';

export interface SaveWhatsappFinancialEntryInput {
  tenantId: string;
  whatsappUserId: string;
  userWhatsapp: string;
  extracted: ExtractedTransactionDto;
  arquivoUrl?: string | null;
  recorrencia?: 'AVULSO' | 'MENSAL';
  leadWhatsapp?: string | null;
}

@Injectable()
export class FinancialEntriesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly normalization: NormalizationService,
    private readonly repository: FinancialEntriesRepository,
  ) {}

  list(tenantId: string, query: ListFinancialEntryDto) {
    return this.repository.listByTenant(tenantId, query);
  }

  async update(tenantId: string, id: string, dto: UpdateFinancialEntryDto) {
    const entry = await this.prisma.financialEntry.findFirst({ where: { id, tenantId } });
    if (!entry) throw new NotFoundException('Lançamento não encontrado.');
    const updated = await this.prisma.financialEntry.update({
      where: { id: entry.id },
      data: {
        ...(dto.descricao !== undefined && { descricao: dto.descricao }),
        ...(dto.observacao !== undefined && { observacao: dto.observacao || null }),
        ...(dto.tipo !== undefined && { tipo: dto.tipo }),
        ...(dto.valorCents !== undefined && { valorCents: dto.valorCents }),
        ...(dto.recorrencia !== undefined && { recorrencia: dto.recorrencia }),
        ...(dto.dataTransacao !== undefined && { dataTransacao: new Date(dto.dataTransacao) }),
        ...(dto.pagadorNome !== undefined && { pagadorNome: dto.pagadorNome }),
        ...(dto.status !== undefined && { status: dto.status }),
      },
      include: { lead: { select: { id: true, name: true, whatsapp: true } } },
    });
    await this.audit.record({
      tenantId,
      actor: 'system',
      action: 'FINANCIAL_ENTRY_UPDATED',
      entityType: 'FinancialEntry',
      entityId: id,
    });
    return updated;
  }

  async remove(tenantId: string, id: string) {
    const entry = await this.prisma.financialEntry.findFirst({ where: { id, tenantId } });
    if (!entry) throw new NotFoundException('Lançamento não encontrado.');
    await this.prisma.$transaction([
      this.prisma.ledgerEntry.deleteMany({
        where: { tenantId, transactionId: { startsWith: `whatsapp-` }, description: entry.descricao },
      }),
      this.prisma.financialEntry.delete({ where: { id: entry.id } }),
    ]);
    await this.audit.record({
      tenantId,
      actor: 'system',
      action: 'FINANCIAL_ENTRY_DELETED',
      entityType: 'FinancialEntry',
      entityId: id,
    });
    return { ok: true };
  }

  async saveFromWhatsapp(input: SaveWhatsappFinancialEntryInput) {
    const amountCents = this.normalization.moneyToCents(input.extracted.valor);
    if (!amountCents || amountCents <= 0) {
      throw new BadRequestException('Valor do comprovante nao identificado.');
    }

    const occurredAt = this.parseDate(input.extracted.data_transacao);
    const transactionId = `whatsapp-${Date.now()}`;

    const pagadorNome = this.nullIfUnknown(input.extracted.pagador.nome);
    const pagadorDoc  = this.nullIfUnknown(input.extracted.pagador.documento);

    // Upsert Lead — busca por doc no Customer para evitar duplicata com ChargesService
    let leadId: string | null = null;
    if (pagadorNome) {
      // Se temos doc, tenta encontrar customer já existente e o lead vinculado
      let existing = pagadorDoc
        ? await this.prisma.lead.findFirst({
            where: { tenantId: input.tenantId, document: pagadorDoc },
            select: { id: true },
          })
        : null;
      // Fallback: busca por nome
      if (!existing) {
        existing = await this.prisma.lead.findFirst({
          where: { tenantId: input.tenantId, name: pagadorNome },
          select: { id: true },
        });
      }
      if (existing) {
        const updated = await this.prisma.lead.update({
          where: { id: existing.id },
          data: {
            ...(input.leadWhatsapp ? { whatsapp: input.leadWhatsapp, phone: input.leadWhatsapp } : {}),
          },
          select: { id: true },
        });
        leadId = updated.id;
      } else {
        const customer = await this.prisma.customer.create({
          data: {
            tenantId: input.tenantId,
            name: pagadorNome,
            document: pagadorDoc,
            phone: input.leadWhatsapp ?? '',
            whatsapp: input.leadWhatsapp ?? null,
            stage: 'CUSTOMER',
          },
          select: { id: true },
        });
        const created = await this.prisma.lead.create({
          data: {
            tenantId: input.tenantId,
            name: pagadorNome,
            document: pagadorDoc,
            whatsapp: input.leadWhatsapp ?? null,
            phone: input.leadWhatsapp ?? null,
            stage: 'CUSTOMER',
            notes: `Lead criado automaticamente via comprovante WhatsApp.`,
            customerId: customer.id,
          },
          select: { id: true },
        });
        leadId = created.id;
      }
    }

    const saved = await this.prisma.$transaction(async (db) => {
      const entry = await db.financialEntry.create({
        data: {
          tenantId: input.tenantId,
          whatsappUserId: input.whatsappUserId,
          userWhatsapp: input.userWhatsapp,
          tipo: input.extracted.tipo,
          valorCents: amountCents,
          moeda: input.extracted.moeda,
          dataTransacao: occurredAt,
          horaTransacao: this.identified(input.extracted.hora_transacao)
            ? input.extracted.hora_transacao
            : null,
          pagadorNome,
          pagadorDocumento: pagadorDoc,
          pagadorInstituicao: this.nullIfUnknown(input.extracted.pagador.instituicao),
          recebedorNome: this.nullIfUnknown(input.extracted.recebedor.nome),
          recebedorDocumento: this.nullIfUnknown(input.extracted.recebedor.documento),
          recebedorInstituicao: this.nullIfUnknown(input.extracted.recebedor.instituicao),
          chavePix: this.nullIfUnknown(input.extracted.chave_pix),
          tipoTransferencia: this.nullIfUnknown(input.extracted.tipo_transferencia),
          idTransacao: this.nullIfUnknown(input.extracted.id_transacao),
          codigoAutenticacao: this.nullIfUnknown(input.extracted.codigo_autenticacao),
          numeroControle: this.nullIfUnknown(input.extracted.numero_controle),
          bancoEmissor: this.nullIfUnknown(input.extracted.banco_emissor),
          situacao: this.nullIfUnknown(input.extracted.situacao),
          descricao: input.extracted.descricao,
          confianca: input.extracted.confianca,
          fonteExtracao: input.extracted.fonte_extracao,
          arquivoUrl: input.arquivoUrl ?? null,
          jsonOriginal: JSON.stringify(input.extracted),
          recorrencia: input.recorrencia ?? 'AVULSO',
          leadId,
          status: 'saved',
        },
      });

      const isIncome = input.extracted.tipo === 'receita';
      await db.ledgerEntry.createMany({
        data: [
          {
            tenantId: input.tenantId,
            transactionId,
            accountCode: isIncome ? 'CASH' : 'EXPENSE',
            direction: 'DEBIT',
            amountCents,
            description: input.extracted.descricao,
          },
          {
            tenantId: input.tenantId,
            transactionId,
            accountCode: isIncome ? 'REVENUE' : 'CASH',
            direction: 'CREDIT',
            amountCents,
            description: input.extracted.descricao,
          },
        ],
      });

      return entry;
    });

    await this.audit.record({
      tenantId: input.tenantId,
      actor: input.userWhatsapp,
      action: 'WHATSAPP_FINANCIAL_ENTRY_SAVED',
      entityType: 'FinancialEntry',
      entityId: saved.id,
      metadata: {
        tipo: saved.tipo,
        valorCents: saved.valorCents,
        whatsappUserId: input.whatsappUserId,
      },
    });

    return saved;
  }

  private parseDate(value: string): Date | null {
    if (!this.identified(value)) return null;
    const date = new Date(`${value}T00:00:00.000Z`);
    return Number.isNaN(date.getTime()) ? null : date;
  }

  private nullIfUnknown(value: string): string | null {
    return this.identified(value) ? value : null;
  }

  private identified(value: string): boolean {
    return this.normalization.identified(value);
  }
}
