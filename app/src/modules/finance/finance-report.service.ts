import { Injectable } from '@nestjs/common';
import * as path from 'path';
// eslint-disable-next-line @typescript-eslint/no-require-imports
const pdfmake = require('pdfmake');
import type { TDocumentDefinitions } from 'pdfmake/interfaces';
import { FinanceService } from './finance.service';

const FONTS_DIR = path.join(
  path.dirname(require.resolve('pdfmake/package.json')),
  'fonts',
  'Roboto',
);

pdfmake.fonts = {
  Roboto: {
    normal: path.join(FONTS_DIR, 'Roboto-Regular.ttf'),
    bold: path.join(FONTS_DIR, 'Roboto-Medium.ttf'),
    italics: path.join(FONTS_DIR, 'Roboto-Italic.ttf'),
    bolditalics: path.join(FONTS_DIR, 'Roboto-MediumItalic.ttf'),
  },
};
pdfmake.setLocalAccessPolicy(() => true);
pdfmake.setUrlAccessPolicy(() => false);

@Injectable()
export class FinanceReportService {
  constructor(private readonly finance: FinanceService) {}

  async cashFlowPdf(tenantId: string, from?: string, to?: string): Promise<Buffer> {
    const [cashflow, kpis] = await Promise.all([
      this.finance.cashFlow(tenantId, from, to),
      this.finance.kpis(tenantId, from, to),
    ]);
    const rows = cashflow.rows.slice(0, 80).map((row) => [
      this.formatDate(row.date),
      row.sourceType === 'RECEIVABLE' ? 'Entrada' : 'Saida',
      row.description,
      row.status,
      this.formatMoney(row.inCents),
      this.formatMoney(row.outCents),
      this.formatMoney(row.balanceCents),
    ]);

    return this.render({
      info: { title: 'Relatorio de Fluxo de Caixa' },
      content: [
        { text: 'Relatorio de Fluxo de Caixa', style: 'title' },
        { text: this.periodLabel(from, to), style: 'muted' },
        {
          columns: [
            this.kpiBox('Entradas', this.formatMoney(kpis.totalIncomeCents)),
            this.kpiBox('Saidas', this.formatMoney(kpis.totalExpenseCents)),
            this.kpiBox('Saldo', this.formatMoney(kpis.balanceCents)),
            this.kpiBox('Projetado', this.formatMoney(kpis.projectedBalanceCents)),
          ],
          columnGap: 8,
          margin: [0, 14, 0, 14],
        },
        {
          table: {
            headerRows: 1,
            widths: [58, 54, '*', 58, 58, 58, 64],
            body: [
              ['Data', 'Tipo', 'Descricao', 'Status', 'Entrada', 'Saida', 'Saldo'],
              ...rows,
            ],
          },
          layout: 'lightHorizontalLines',
        },
      ],
      styles: this.styles(),
      defaultStyle: { fontSize: 8 },
      pageOrientation: 'landscape',
      pageMargins: [28, 30, 28, 30],
    } as unknown as TDocumentDefinitions);
  }

  async summaryPdf(tenantId: string, from?: string, to?: string): Promise<Buffer> {
    const kpis = await this.finance.kpis(tenantId, from, to);

    return this.render({
      info: { title: 'Resumo Financeiro' },
      content: [
        { text: 'Resumo Financeiro', style: 'title' },
        { text: this.periodLabel(from, to), style: 'muted' },
        {
          columns: [
            this.kpiBox('Recebido', this.formatMoney(kpis.totalIncomeCents)),
            this.kpiBox('A receber', this.formatMoney(kpis.pendingReceivablesCents)),
            this.kpiBox('Pago', this.formatMoney(kpis.totalExpenseCents)),
            this.kpiBox('A pagar', this.formatMoney(kpis.pendingPayablesCents)),
          ],
          columnGap: 8,
          margin: [0, 14, 0, 14],
        },
        {
          table: {
            widths: ['*', '*'],
            body: [
              ['Indicador', 'Valor'],
              ['Saldo realizado', this.formatMoney(kpis.balanceCents)],
              ['Saldo projetado', this.formatMoney(kpis.projectedBalanceCents)],
              ['Taxa de recebimento', `${kpis.collectionRate}%`],
              ['Inadimplencia', `${kpis.defaultRate}%`],
              ['Cobrancas vencidas', String(kpis.overdueCharges)],
              ['DSO', `${kpis.dsoDays} dias`],
              ['Leads', String(kpis.leadCount)],
              ['Clientes', String(kpis.customerCount)],
              ['Lancamentos WhatsApp', String(kpis.whatsappCount)],
            ],
          },
          layout: 'lightHorizontalLines',
        },
      ],
      styles: this.styles(),
      defaultStyle: { fontSize: 10 },
      pageMargins: [36, 36, 36, 36],
    } as unknown as TDocumentDefinitions);
  }

  private async render(docDefinition: TDocumentDefinitions): Promise<Buffer> {
    return pdfmake.createPdf(docDefinition).getBuffer() as Promise<Buffer>;
  }

  private kpiBox(label: string, value: string) {
    return {
      stack: [
        { text: label, style: 'kpiLabel' },
        { text: value, style: 'kpiValue' },
      ],
      margin: [0, 0, 0, 0],
    };
  }

  private styles() {
    return {
      title: { fontSize: 18, bold: true, margin: [0, 0, 0, 4] },
      muted: { fontSize: 9, color: '#667085' },
      kpiLabel: { fontSize: 8, color: '#667085' },
      kpiValue: { fontSize: 13, bold: true, margin: [0, 2, 0, 0] },
    };
  }

  private periodLabel(from?: string, to?: string): string {
    if (!from && !to) return 'Periodo: todos os registros';
    return `Periodo: ${from ?? 'inicio'} ate ${to ?? 'hoje'}`;
  }

  private formatDate(date: Date): string {
    return date.toLocaleDateString('pt-BR');
  }

  private formatMoney(cents: number): string {
    return (cents / 100).toLocaleString('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    });
  }
}
