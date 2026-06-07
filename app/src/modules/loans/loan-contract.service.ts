import { Injectable } from '@nestjs/common';
import { createPdf } from 'pdfmake';
import type { TDocumentDefinitions } from 'pdfmake/interfaces';

interface ContractLoan {
  id: string;
  principalCents: number;
  totalCents: number;
  cetPercent: number;
  interestRate: number;
  interestType: string;
  installments: number;
  firstDueAt: Date;
  lateFeePercent: number;
  lateInterestDaily: number;
  createdAt: Date;
  customer: {
    name: string;
    document?: string | null;
    phone?: string | null;
  };
  installmentsList: Array<{
    number: number;
    principalCents: number;
    interestCents: number;
    totalCents: number;
    dueAt: Date;
  }>;
}

@Injectable()
export class LoanContractService {
  async pdf(loan: ContractLoan, tenantName = 'Credor'): Promise<Buffer> {
    const doc: TDocumentDefinitions = {
      info: { title: `Contrato de Emprestimo ${loan.id}` },
      content: [
        { text: 'Contrato de Emprestimo', style: 'title' },
        { text: `Contrato: ${loan.id}`, style: 'muted' },
        {
          table: {
            widths: ['*', '*'],
            body: [
              ['Credor', tenantName],
              ['Devedor', loan.customer.name],
              ['CPF/CNPJ do devedor', loan.customer.document ?? 'Nao informado'],
              ['Telefone', loan.customer.phone ?? 'Nao informado'],
            ],
          },
          layout: 'lightHorizontalLines',
          margin: [0, 12, 0, 12],
        },
        {
          columns: [
            this.kpi('Principal', this.money(loan.principalCents)),
            this.kpi('Total a pagar', this.money(loan.totalCents)),
            this.kpi('CET anual', `${loan.cetPercent.toFixed(2)}%`),
            this.kpi('Parcelas', String(loan.installments)),
          ],
          columnGap: 8,
          margin: [0, 0, 0, 12],
        },
        {
          text:
            `Taxa: ${loan.interestRate}% ${loan.interestType === 'MONTHLY' ? 'ao mes' : 'ao ano'}. ` +
            `Multa por atraso: ${loan.lateFeePercent}%. Juros de mora: ${loan.lateInterestDaily}% ao dia.`,
          margin: [0, 0, 0, 10],
        },
        { text: 'Tabela de amortizacao', style: 'section' },
        {
          table: {
            headerRows: 1,
            widths: [36, 68, '*', '*', '*'],
            body: [
              ['Parc.', 'Vencimento', 'Principal', 'Juros', 'Total'],
              ...loan.installmentsList.map((item) => [
                String(item.number),
                this.date(item.dueAt),
                this.money(item.principalCents),
                this.money(item.interestCents),
                this.money(item.totalCents),
              ]),
            ],
          },
          layout: 'lightHorizontalLines',
        },
        {
          text:
            'Assinatura digital: a validade depende de confirmacao com IP, timestamp e aceite expresso das partes. ' +
            'Consulte suporte juridico antes de operar credito em escala.',
          style: 'muted',
          margin: [0, 14, 0, 0],
        },
      ],
      styles: {
        title: { fontSize: 18, bold: true },
        section: { fontSize: 12, bold: true, margin: [0, 8, 0, 6] },
        muted: { fontSize: 8, color: '#667085' },
        kpiLabel: { fontSize: 8, color: '#667085' },
        kpiValue: { fontSize: 12, bold: true },
      },
      defaultStyle: { fontSize: 9 },
      pageMargins: [32, 32, 32, 32],
    };

    return createPdf(doc).getBuffer();
  }

  private kpi(label: string, value: string) {
    return { stack: [{ text: label, style: 'kpiLabel' }, { text: value, style: 'kpiValue' }] };
  }

  private money(cents: number): string {
    return (cents / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  }

  private date(date: Date): string {
    return date.toLocaleDateString('pt-BR');
  }
}
