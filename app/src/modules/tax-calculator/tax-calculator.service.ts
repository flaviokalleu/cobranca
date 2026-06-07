import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';

const SIMPLE_TABLES: Record<string, Array<{ max: number; rateBps: number; deduction: number }>> = {
  SIMPLES_I: [
    { max: 18000000, rateBps: 400, deduction: 0 },
    { max: 36000000, rateBps: 730, deduction: 594000 },
    { max: 72000000, rateBps: 950, deduction: 1386000 },
    { max: 180000000, rateBps: 1070, deduction: 2250000 },
    { max: 360000000, rateBps: 1430, deduction: 8730000 },
    { max: 480000000, rateBps: 1900, deduction: 37800000 },
  ],
  SIMPLES_III: [
    { max: 18000000, rateBps: 600, deduction: 0 },
    { max: 36000000, rateBps: 1120, deduction: 936000 },
    { max: 72000000, rateBps: 1350, deduction: 1764000 },
    { max: 180000000, rateBps: 1600, deduction: 3564000 },
    { max: 360000000, rateBps: 2100, deduction: 12564000 },
    { max: 480000000, rateBps: 3300, deduction: 64800000 },
  ],
};

@Injectable()
export class TaxCalculatorService {
  constructor(private readonly prisma: PrismaService) {}

  async calculate(
    tenantId: string,
    regime: string,
    revenue12mCents: number,
    revenueMonthCents: number,
    period = new Date().toISOString().slice(0, 7),
  ) {
    const result = regime === 'MEI'
      ? this.calculateMei()
      : this.calculateSimples(regime, revenue12mCents, revenueMonthCents);
    return this.prisma.taxCalculation.create({
      data: {
        tenantId,
        regime,
        period,
        revenue12mCents,
        revenueMonthCents,
        dasCents: result.dasCents,
        effectiveRateBps: result.effectiveRateBps,
        breakdown: result.breakdown,
      },
    });
  }

  history(tenantId: string) {
    return this.prisma.taxCalculation.findMany({ where: { tenantId }, orderBy: { createdAt: 'desc' }, take: 24 });
  }

  private calculateMei() {
    return { dasCents: 7060, effectiveRateBps: 0, breakdown: { dasFixoCents: 7060, note: 'Estimativa MEI servicos.' } };
  }

  private calculateSimples(regime: string, revenue12mCents: number, revenueMonthCents: number) {
    const table = SIMPLE_TABLES[regime] ?? SIMPLE_TABLES.SIMPLES_III;
    const bracket = table.find((row) => revenue12mCents <= row.max) ?? table[table.length - 1];
    const effectiveRateBps = Math.max(0, Math.round(((revenue12mCents * bracket.rateBps) / 10000 - bracket.deduction) / Math.max(1, revenue12mCents) * 10000));
    const dasCents = Math.round((revenueMonthCents * effectiveRateBps) / 10000);
    return { dasCents, effectiveRateBps, breakdown: { regime, bracket, estimated: true } };
  }
}
