import { Body, Controller, Get, Param, Post, Query, Res } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import type { Response } from 'express';
import { Roles } from '../../auth/decorators/roles.decorator';
import { PolicyAction, PolicyResource } from '../../auth/decorators/policy.decorator';
import { PaginationDto } from '../../common/dto/pagination.dto';
import { Tenant } from '../../common/tenant/tenant.decorator';
import { CreateLoanDto } from './dto/create-loan.dto';
import { PayLoanInstallmentDto } from './dto/pay-loan-installment.dto';
import { SimulateLoanDto } from './dto/simulate-loan.dto';
import { LoansService } from './loans.service';

@ApiTags('Emprestimos')
@ApiBearerAuth('JWT')
@PolicyResource('Loan')
@Controller('loans')
export class LoansController {
  constructor(private readonly loans: LoansService) {}

  @Roles('ADMIN', 'FINANCE', 'COMMERCIAL')
  @PolicyAction('read')
  @Post('simulate')
  simulate(@Body() dto: SimulateLoanDto) {
    return this.loans.simulate(dto);
  }

  @Roles('ADMIN', 'FINANCE')
  @Post()
  create(@Tenant() tenantId: string, @Body() dto: CreateLoanDto) {
    return this.loans.create(tenantId, dto);
  }

  @Roles('ADMIN', 'FINANCE', 'COMMERCIAL')
  @Get()
  list(@Tenant() tenantId: string, @Query() query: PaginationDto) {
    return this.loans.list(tenantId, query);
  }

  @Roles('ADMIN', 'FINANCE', 'COMMERCIAL')
  @Get(':id')
  get(@Tenant() tenantId: string, @Param('id') id: string) {
    return this.loans.get(tenantId, id);
  }

  @Roles('ADMIN', 'FINANCE')
  @PolicyAction('update')
  @Post(':id/activate')
  activate(@Tenant() tenantId: string, @Param('id') id: string) {
    return this.loans.activate(tenantId, id);
  }

  @Roles('ADMIN', 'FINANCE', 'COMMERCIAL')
  @Get(':id/payoff-quote')
  payoffQuote(@Tenant() tenantId: string, @Param('id') id: string) {
    return this.loans.payoffQuote(tenantId, id);
  }

  @Roles('ADMIN', 'FINANCE')
  @PolicyAction('pay')
  @Post(':id/payoff')
  payoff(@Tenant() tenantId: string, @Param('id') id: string) {
    return this.loans.payoff(tenantId, id);
  }

  @Roles('ADMIN', 'FINANCE')
  @PolicyAction('pay')
  @Post(':id/installments/:installmentId/pay')
  recordPayment(
    @Tenant() tenantId: string,
    @Param('id') id: string,
    @Param('installmentId') installmentId: string,
    @Body() dto: PayLoanInstallmentDto,
  ) {
    return this.loans.recordPayment(tenantId, id, installmentId, dto.amountCents);
  }

  @Roles('ADMIN', 'FINANCE', 'COMMERCIAL')
  @PolicyAction('report')
  @Get(':id/contract/pdf')
  async contractPdf(
    @Tenant() tenantId: string,
    @Param('id') id: string,
    @Res() res: Response,
  ) {
    const pdf = await this.loans.contractPdf(tenantId, id);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="contrato-${id}.pdf"`);
    res.send(pdf);
  }
}
