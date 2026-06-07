import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { LoanInterest, LoanStatus, Prisma } from '@prisma/client';
import { AuditService } from '../../common/audit/audit.service';
import { paginated, paginationArgs, PaginationDto } from '../../common/dto/pagination.dto';
import { PrismaService } from '../../common/prisma/prisma.service';
import { LedgerService } from '../ledger/ledger.service';
import { ChargesService } from '../charges/charges.service';
import { CreateLoanDto } from './dto/create-loan.dto';
import { SimulateLoanDto } from './dto/simulate-loan.dto';
import { LoanContractService } from './loan-contract.service';

interface ScheduleRow {
  number: number;
  dueAt: Date;
  principalCents: number;
  interestCents: number;
  totalCents: number;
  balanceCents: number;
}

@Injectable()
export class LoansService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly ledger: LedgerService,
    private readonly charges: ChargesService,
    private readonly audit: AuditService,
    private readonly contracts: LoanContractService,
  ) {}

  simulate(dto: SimulateLoanDto) {
    const interestRate = this.interestRate(dto);
    const monthlyRate =
      dto.interestType === 'MONTHLY'
        ? interestRate / 100
        : Math.pow(1 + interestRate / 100, 1 / 12) - 1;
    const installmentAmount = monthlyRate === 0
      ? dto.principalCents / dto.installments
      : (dto.principalCents * (monthlyRate * Math.pow(1 + monthlyRate, dto.installments))) /
        (Math.pow(1 + monthlyRate, dto.installments) - 1);

    let balance = dto.principalCents;
    const schedule: ScheduleRow[] = [];
    for (let index = 1; index <= dto.installments; index += 1) {
      const interestCents = Math.round(balance * monthlyRate);
      const isLast = index === dto.installments;
      const principalCents = isLast
        ? balance
        : Math.max(0, Math.round(installmentAmount) - interestCents);
      const totalCents = principalCents + interestCents;
      balance = Math.max(0, balance - principalCents);
      schedule.push({
        number: index,
        dueAt: this.addMonths(new Date(dto.firstDueAt), index - 1),
        principalCents,
        interestCents,
        totalCents,
        balanceCents: balance,
      });
    }

    const totalAmount = schedule.reduce((sum, row) => sum + row.totalCents, 0);
    return {
      installmentAmount: schedule[0]?.totalCents ?? 0,
      totalAmount,
      totalInterest: totalAmount - dto.principalCents,
      cetPercent: this.cetPercent(totalAmount, dto.principalCents, dto.installments),
      schedule,
    };
  }

  async create(tenantId: string, dto: CreateLoanDto) {
    const customer = await this.prisma.customer.findFirst({
      where: { id: dto.customerId, tenantId },
    });
    if (!customer) throw new NotFoundException('Cliente nao encontrado neste tenant.');

    const simulation = this.simulate(dto);
    const loan = await this.prisma.loan.create({
      data: {
        tenantId,
        customerId: customer.id,
        principalCents: dto.principalCents,
        totalCents: simulation.totalAmount,
        cetPercent: simulation.cetPercent,
        interestRate: this.interestRate(dto),
        interestType: dto.interestType as LoanInterest,
        installments: dto.installments,
        firstDueAt: new Date(dto.firstDueAt),
        lateFeePercent: dto.lateFeePercent ?? 2,
        lateInterestDaily: dto.lateInterestDaily ?? 0.033,
        status: 'PENDING_SIGNATURE',
        contractUrl: '',
        installmentsList: {
          create: simulation.schedule.map((row) => ({
            tenantId,
            number: row.number,
            principalCents: row.principalCents,
            interestCents: row.interestCents,
            totalCents: row.totalCents,
            dueAt: row.dueAt,
          })),
        },
      },
      include: { customer: true, installmentsList: { orderBy: { number: 'asc' } } },
    });

    const contractUrl = `/loans/${loan.id}/contract/pdf`;
    const updated = await this.prisma.loan.update({
      where: { id: loan.id },
      data: { contractUrl },
      include: { customer: true, installmentsList: { orderBy: { number: 'asc' } } },
    });

    await this.audit.record({
      tenantId,
      actor: 'system',
      action: 'LOAN_CREATED',
      entityType: 'Loan',
      entityId: loan.id,
      metadata: { principalCents: loan.principalCents, installments: loan.installments },
    });

    return updated;
  }

  async list(tenantId: string, query: PaginationDto) {
    const { skip, take } = paginationArgs(query);
    const search = query.search?.trim();
    const statusSearch = this.loanStatus(search);
    const where: Prisma.LoanWhereInput = {
      tenantId,
      ...(search
        ? {
            OR: [
              { customer: { name: { contains: search, mode: 'insensitive' as const } } },
              ...(statusSearch ? [{ status: statusSearch }] : []),
            ],
          }
        : {}),
    };
    const [data, total] = await this.prisma.$transaction([
      this.prisma.loan.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        include: {
          customer: { select: { id: true, name: true, document: true, phone: true } },
          installmentsList: { orderBy: { number: 'asc' } },
        },
        skip,
        take,
      }),
      this.prisma.loan.count({ where }),
    ]);
    return paginated(data, total, query);
  }

  async get(tenantId: string, id: string) {
    const loan = await this.prisma.loan.findFirst({
      where: { id, tenantId },
      include: {
        customer: { select: { id: true, name: true, document: true, phone: true } },
        installmentsList: { orderBy: { number: 'asc' } },
      },
    });
    if (!loan) throw new NotFoundException('Emprestimo nao encontrado.');
    return loan;
  }

  async activate(tenantId: string, id: string) {
    const loan = await this.get(tenantId, id);
    if (!['DRAFT', 'PENDING_SIGNATURE'].includes(loan.status)) {
      throw new BadRequestException('Emprestimo ja foi ativado ou finalizado.');
    }

    await this.ledger.post(tenantId, `loan-disbursement:${loan.id}`, [
      {
        accountCode: 'LOANS_RECEIVABLE',
        direction: 'DEBIT',
        amountCents: loan.principalCents,
        description: `Principal do emprestimo ${loan.id}`,
      },
      {
        accountCode: 'CASH',
        direction: 'CREDIT',
        amountCents: loan.principalCents,
        description: `Liberacao do emprestimo ${loan.id}`,
      },
    ]);

    for (const installment of loan.installmentsList) {
      if (installment.chargeId) continue;
      const charge = await this.charges.create(tenantId, {
        customerId: loan.customerId,
        amountCents: installment.totalCents,
        description: `Parcela ${installment.number}/${loan.installments} - emprestimo`,
        dueDate: installment.dueAt.toISOString(),
        category: 'Emprestimos',
        recurrence: 'ONCE',
      });
      await this.prisma.loanInstallment.update({
        where: { id: installment.id },
        data: { chargeId: charge.id },
      });
    }

    const updated = await this.prisma.loan.update({
      where: { id: loan.id },
      data: { status: 'ACTIVE', disbursedAt: new Date(), contractSignedAt: new Date() },
      include: { customer: true, installmentsList: { orderBy: { number: 'asc' } } },
    });
    await this.audit.record({
      tenantId,
      actor: 'system',
      action: 'LOAN_ACTIVATED',
      entityType: 'Loan',
      entityId: loan.id,
    });
    return updated;
  }

  async payoffQuote(tenantId: string, id: string) {
    const loan = await this.get(tenantId, id);
    const pending = loan.installmentsList.filter((item) => item.status !== 'PAID');
    const balanceCents = pending.reduce((sum, row) => sum + row.principalCents, 0);
    const futureInterestCents = pending.reduce((sum, row) => sum + row.interestCents, 0);
    const overdueFeesCents = pending.reduce((sum, row) => sum + this.lateFees(loan, row), 0);
    return {
      balanceCents,
      discountCents: futureInterestCents,
      overdueFeesCents,
      payoffAmountCents: balanceCents + overdueFeesCents,
    };
  }

  async payoff(tenantId: string, id: string) {
    const quote = await this.payoffQuote(tenantId, id);
    await this.ledger.post(tenantId, `loan-payoff:${id}`, [
      {
        accountCode: 'CASH',
        direction: 'DEBIT',
        amountCents: quote.payoffAmountCents,
        description: `Quitacao antecipada do emprestimo ${id}`,
      },
      {
        accountCode: 'LOANS_RECEIVABLE',
        direction: 'CREDIT',
        amountCents: quote.balanceCents,
        description: `Baixa do principal do emprestimo ${id}`,
      },
      ...(quote.overdueFeesCents > 0
        ? [
            {
              accountCode: 'INTEREST_REVENUE',
              direction: 'CREDIT' as const,
              amountCents: quote.overdueFeesCents,
              description: `Mora de quitacao do emprestimo ${id}`,
            },
          ]
        : []),
    ]);
    await this.prisma.loanInstallment.updateMany({
      where: { tenantId, loanId: id, status: { not: 'PAID' } },
      data: { status: 'PAID', paidAt: new Date(), paidAmountCents: 0 },
    });
    return this.prisma.loan.update({
      where: { id },
      data: { status: 'PAID', quitedAt: new Date() },
      include: { customer: true, installmentsList: { orderBy: { number: 'asc' } } },
    });
  }

  async recordPayment(
    tenantId: string,
    loanId: string,
    installmentId: string,
    amountCents: number,
  ) {
    const loan = await this.get(tenantId, loanId);
    const installment = loan.installmentsList.find((item) => item.id === installmentId);
    if (!installment) throw new NotFoundException('Parcela nao encontrada.');
    if (installment.status === 'PAID') throw new BadRequestException('Parcela ja esta paga.');

    const dueCents = installment.totalCents + this.lateFees(loan, installment);
    if (amountCents < dueCents) {
      throw new BadRequestException(`Valor insuficiente. Total devido: ${dueCents} centavos.`);
    }

    await this.ledger.post(tenantId, `loan-installment:${installment.id}`, [
      {
        accountCode: 'CASH',
        direction: 'DEBIT',
        amountCents,
        description: `Pagamento da parcela ${installment.number} do emprestimo ${loan.id}`,
      },
      {
        accountCode: 'LOANS_RECEIVABLE',
        direction: 'CREDIT',
        amountCents: installment.principalCents,
        description: `Principal da parcela ${installment.number}`,
      },
      {
        accountCode: 'INTEREST_REVENUE',
        direction: 'CREDIT',
        amountCents: amountCents - installment.principalCents,
        description: `Juros da parcela ${installment.number}`,
      },
    ]);

    await this.prisma.$transaction([
      this.prisma.loanInstallment.update({
        where: { id: installment.id },
        data: { status: 'PAID', paidAt: new Date(), paidAmountCents: amountCents },
      }),
      ...(installment.chargeId
        ? [
            this.prisma.charge.updateMany({
              where: { id: installment.chargeId, tenantId },
              data: { status: 'PAID', paidAt: new Date() },
            }),
          ]
        : []),
    ]);

    const remaining = await this.prisma.loanInstallment.count({
      where: { tenantId, loanId, status: { not: 'PAID' } },
    });
    if (remaining === 0) {
      await this.prisma.loan.update({
        where: { id: loanId },
        data: { status: 'PAID', quitedAt: new Date() },
      });
    }

    return this.get(tenantId, loanId);
  }

  async contractPdf(tenantId: string, id: string) {
    const loan = await this.prisma.loan.findFirst({
      where: { id, tenantId },
      include: { customer: true, installmentsList: { orderBy: { number: 'asc' } } },
    });
    if (!loan) throw new NotFoundException('Emprestimo nao encontrado.');
    const tenant = await this.prisma.tenant.findUnique({ where: { id: tenantId } });
    return this.contracts.pdf(loan, tenant?.name ?? 'Credor');
  }

  @Cron('0 9 * * *')
  async checkOverdue() {
    const now = new Date();
    const overdue = await this.prisma.loanInstallment.findMany({
      where: { status: 'PENDING', dueAt: { lt: now } },
      include: { loan: true },
      take: 500,
    });
    for (const installment of overdue) {
      await this.prisma.loanInstallment.update({
        where: { id: installment.id },
        data: { status: 'OVERDUE' },
      });
      const overdueCount = await this.prisma.loanInstallment.count({
        where: {
          tenantId: installment.tenantId,
          loanId: installment.loanId,
          status: 'OVERDUE',
        },
      });
      if (overdueCount >= 3 && installment.loan.status === 'ACTIVE') {
        await this.prisma.loan.update({
          where: { id: installment.loanId },
          data: { status: 'DEFAULTED' },
        });
      }
    }
  }

  private interestRate(dto: SimulateLoanDto): number {
    const rate =
      dto.interestType === 'MONTHLY' ? dto.monthlyInterestRate : dto.yearlyInterestRate;
    if (!rate || rate <= 0) {
      throw new BadRequestException('Informe a taxa de juros conforme o tipo escolhido.');
    }
    return rate;
  }

  private loanStatus(value?: string): LoanStatus | null {
    if (!value) return null;
    const normalized = value.trim().toUpperCase();
    return Object.values(LoanStatus).find((status) => status === normalized) ?? null;
  }

  private cetPercent(totalCents: number, principalCents: number, installments: number): number {
    const monthlyFactor = Math.pow(totalCents / principalCents, 1 / Math.max(1, installments)) - 1;
    return (Math.pow(1 + monthlyFactor, 12) - 1) * 100;
  }

  private lateFees(
    loan: { lateFeePercent: number; lateInterestDaily: number },
    installment: { dueAt: Date; totalCents: number; status: string },
  ): number {
    if (installment.status === 'PAID') return 0;
    const now = new Date();
    if (installment.dueAt.getTime() >= now.getTime()) return 0;
    const daysLate = Math.ceil((now.getTime() - installment.dueAt.getTime()) / 86_400_000);
    const fee = Math.round((installment.totalCents * loan.lateFeePercent) / 100);
    const interest = Math.round((installment.totalCents * loan.lateInterestDaily * daysLate) / 100);
    return fee + interest;
  }

  private addMonths(date: Date, months: number): Date {
    const copy = new Date(date);
    const day = copy.getDate();
    copy.setMonth(copy.getMonth() + months);
    if (copy.getDate() < day) copy.setDate(0);
    return copy;
  }
}
