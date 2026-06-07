import { Controller, Get, Query, Res } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Response } from 'express';
import { FinanceService } from './finance.service';
import { FinanceReportService } from './finance-report.service';
import { Tenant } from '../../common/tenant/tenant.decorator';
import { Roles } from '../../auth/decorators/roles.decorator';
import { PolicyAction, PolicyResource } from '../../auth/decorators/policy.decorator';

@ApiTags('Financeiro')
@ApiBearerAuth('JWT')
@PolicyResource('Finance')
@Controller('finance')
export class FinanceController {
  constructor(
    private readonly finance: FinanceService,
    private readonly reports: FinanceReportService,
  ) {}

  @Roles('ADMIN', 'FINANCE', 'AGENT')
  @ApiOperation({ summary: 'Consultar fluxo de caixa' })
  @Get('cashflow')
  cashFlow(
    @Tenant() tenantId: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    return this.finance.cashFlow(tenantId, from, to);
  }

  @Roles('ADMIN', 'FINANCE')
  @ApiOperation({ summary: 'Consultar resumo financeiro' })
  @Get('summary')
  summary(
    @Tenant() tenantId: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    return this.finance.summary(tenantId, from, to);
  }

  @Roles('ADMIN', 'FINANCE', 'COMMERCIAL', 'OPERATIONS', 'AGENT')
  @ApiOperation({ summary: 'Consultar KPIs consolidados do dashboard' })
  @Get('kpis')
  kpis(
    @Tenant() tenantId: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    return this.finance.kpis(tenantId, from, to);
  }

  @Roles('ADMIN', 'FINANCE')
  @ApiOperation({ summary: 'Consultar projecao de fluxo de caixa' })
  @Get('cashflow-projection')
  projection(@Tenant() tenantId: string, @Query('days') days?: string) {
    return this.finance.cashFlowProjection(tenantId, Number(days ?? 90));
  }

  @Roles('ADMIN', 'FINANCE')
  @ApiOperation({ summary: 'Consultar DRE dinamica' })
  @Get('dre')
  dre(
    @Tenant() tenantId: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    return this.finance.dre(tenantId, from, to);
  }

  @Roles('ADMIN', 'FINANCE')
  @PolicyAction('report')
  @ApiOperation({ summary: 'Gerar PDF do fluxo de caixa' })
  @Get('reports/cashflow.pdf')
  async cashFlowPdf(
    @Tenant() tenantId: string,
    @Res() res: Response,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    const pdf = await this.reports.cashFlowPdf(tenantId, from, to);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename="fluxo-de-caixa.pdf"');
    res.send(pdf);
  }

  @Roles('ADMIN', 'FINANCE')
  @PolicyAction('report')
  @ApiOperation({ summary: 'Gerar PDF do resumo financeiro' })
  @Get('reports/summary.pdf')
  async summaryPdf(
    @Tenant() tenantId: string,
    @Res() res: Response,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    const pdf = await this.reports.summaryPdf(tenantId, from, to);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename="resumo-financeiro.pdf"');
    res.send(pdf);
  }
}
