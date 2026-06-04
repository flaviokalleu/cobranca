import { Body, Controller, Delete, Get, Param, Patch, Post } from '@nestjs/common';
import { Roles } from '../../auth/decorators/roles.decorator';
import { Tenant } from '../../common/tenant/tenant.decorator';
import { PersonalFinanceService } from './personal-finance.service';
import { CreatePersonalFinanceAccountDto } from './dto/create-personal-finance-account.dto';
import { CreatePersonalCreditCardDto } from './dto/create-personal-credit-card.dto';
import { CreatePersonalTransactionDto } from './dto/create-personal-transaction.dto';
import { IngestFinanceMessageDto } from './dto/ingest-finance-message.dto';
import { CreateSpendingLimitDto } from './dto/create-spending-limit.dto';
import { CreateInvestmentGoalDto } from './dto/create-investment-goal.dto';
import { ContributeInvestmentGoalDto } from './dto/contribute-investment-goal.dto';
import { UpdatePersonalFinanceAccountDto } from './dto/update-personal-finance-account.dto';
import { UpdatePersonalCreditCardDto } from './dto/update-personal-credit-card.dto';
import { UpdatePersonalTransactionDto } from './dto/update-personal-transaction.dto';
import { UpdateSpendingLimitDto } from './dto/update-spending-limit.dto';
import { UpdateInvestmentGoalDto } from './dto/update-investment-goal.dto';

@Controller('personal-finance')
export class PersonalFinanceController {
  constructor(private readonly personalFinance: PersonalFinanceService) {}

  @Roles('ADMIN', 'FINANCE', 'COMMERCIAL', 'OPERATIONS', 'USER', 'AGENT')
  @Get('summary')
  summary(@Tenant() tenantId: string) {
    return this.personalFinance.summary(tenantId);
  }

  @Roles('ADMIN', 'FINANCE', 'COMMERCIAL', 'OPERATIONS', 'USER', 'AGENT')
  @Get('accounts')
  listAccounts(@Tenant() tenantId: string) {
    return this.personalFinance.listAccounts(tenantId);
  }

  @Roles('ADMIN', 'FINANCE', 'USER', 'AGENT')
  @Post('accounts')
  createAccount(@Tenant() tenantId: string, @Body() dto: CreatePersonalFinanceAccountDto) {
    return this.personalFinance.createAccount(tenantId, dto);
  }

  @Roles('ADMIN', 'FINANCE', 'USER', 'AGENT')
  @Patch('accounts/:id')
  updateAccount(
    @Tenant() tenantId: string,
    @Param('id') id: string,
    @Body() dto: UpdatePersonalFinanceAccountDto,
  ) {
    return this.personalFinance.updateAccount(tenantId, id, dto);
  }

  @Roles('ADMIN', 'FINANCE', 'USER', 'AGENT')
  @Delete('accounts/:id')
  removeAccount(@Tenant() tenantId: string, @Param('id') id: string) {
    return this.personalFinance.removeAccount(tenantId, id);
  }

  @Roles('ADMIN', 'FINANCE', 'COMMERCIAL', 'OPERATIONS', 'USER', 'AGENT')
  @Get('cards')
  listCards(@Tenant() tenantId: string) {
    return this.personalFinance.listCards(tenantId);
  }

  @Roles('ADMIN', 'FINANCE', 'USER', 'AGENT')
  @Post('cards')
  createCard(@Tenant() tenantId: string, @Body() dto: CreatePersonalCreditCardDto) {
    return this.personalFinance.createCard(tenantId, dto);
  }

  @Roles('ADMIN', 'FINANCE', 'USER', 'AGENT')
  @Patch('cards/:id')
  updateCard(
    @Tenant() tenantId: string,
    @Param('id') id: string,
    @Body() dto: UpdatePersonalCreditCardDto,
  ) {
    return this.personalFinance.updateCard(tenantId, id, dto);
  }

  @Roles('ADMIN', 'FINANCE', 'USER', 'AGENT')
  @Delete('cards/:id')
  removeCard(@Tenant() tenantId: string, @Param('id') id: string) {
    return this.personalFinance.removeCard(tenantId, id);
  }

  @Roles('ADMIN', 'FINANCE', 'COMMERCIAL', 'OPERATIONS', 'USER', 'AGENT')
  @Get('transactions')
  listTransactions(@Tenant() tenantId: string) {
    return this.personalFinance.listTransactions(tenantId);
  }

  @Roles('ADMIN', 'FINANCE', 'USER', 'AGENT')
  @Post('transactions')
  createTransaction(@Tenant() tenantId: string, @Body() dto: CreatePersonalTransactionDto) {
    return this.personalFinance.createTransaction(tenantId, dto);
  }

  @Roles('ADMIN', 'FINANCE', 'USER', 'AGENT')
  @Patch('transactions/:id')
  updateTransaction(
    @Tenant() tenantId: string,
    @Param('id') id: string,
    @Body() dto: UpdatePersonalTransactionDto,
  ) {
    return this.personalFinance.updateTransaction(tenantId, id, dto);
  }

  @Roles('ADMIN', 'FINANCE', 'USER', 'AGENT')
  @Delete('transactions/:id')
  removeTransaction(@Tenant() tenantId: string, @Param('id') id: string) {
    return this.personalFinance.removeTransaction(tenantId, id);
  }

  @Roles('ADMIN', 'FINANCE', 'USER', 'AGENT')
  @Post('ingest')
  ingest(@Tenant() tenantId: string, @Body() dto: IngestFinanceMessageDto) {
    return this.personalFinance.ingestMessage(tenantId, dto);
  }

  @Roles('ADMIN', 'FINANCE', 'USER', 'AGENT')
  @Get('limits')
  listLimits(@Tenant() tenantId: string) {
    return this.personalFinance.listLimits(tenantId);
  }

  @Roles('ADMIN', 'FINANCE', 'USER', 'AGENT')
  @Post('limits')
  createLimit(@Tenant() tenantId: string, @Body() dto: CreateSpendingLimitDto) {
    return this.personalFinance.createLimit(tenantId, dto);
  }

  @Roles('ADMIN', 'FINANCE', 'USER', 'AGENT')
  @Patch('limits/:id')
  updateLimit(
    @Tenant() tenantId: string,
    @Param('id') id: string,
    @Body() dto: UpdateSpendingLimitDto,
  ) {
    return this.personalFinance.updateLimit(tenantId, id, dto);
  }

  @Roles('ADMIN', 'FINANCE', 'USER', 'AGENT')
  @Delete('limits/:id')
  removeLimit(@Tenant() tenantId: string, @Param('id') id: string) {
    return this.personalFinance.removeLimit(tenantId, id);
  }

  @Roles('ADMIN', 'FINANCE', 'USER', 'AGENT')
  @Get('goals')
  listGoals(@Tenant() tenantId: string) {
    return this.personalFinance.listGoals(tenantId);
  }

  @Roles('ADMIN', 'FINANCE', 'USER', 'AGENT')
  @Post('goals')
  createGoal(@Tenant() tenantId: string, @Body() dto: CreateInvestmentGoalDto) {
    return this.personalFinance.createGoal(tenantId, dto);
  }

  @Roles('ADMIN', 'FINANCE', 'USER', 'AGENT')
  @Patch('goals/:id')
  updateGoal(
    @Tenant() tenantId: string,
    @Param('id') id: string,
    @Body() dto: UpdateInvestmentGoalDto,
  ) {
    return this.personalFinance.updateGoal(tenantId, id, dto);
  }

  @Roles('ADMIN', 'FINANCE', 'USER', 'AGENT')
  @Delete('goals/:id')
  removeGoal(@Tenant() tenantId: string, @Param('id') id: string) {
    return this.personalFinance.removeGoal(tenantId, id);
  }

  @Roles('ADMIN', 'FINANCE', 'USER', 'AGENT')
  @Post('goals/:id/contribute')
  contributeGoal(
    @Tenant() tenantId: string,
    @Param('id') id: string,
    @Body() dto: ContributeInvestmentGoalDto,
  ) {
    return this.personalFinance.contributeGoal(tenantId, id, dto);
  }
}
