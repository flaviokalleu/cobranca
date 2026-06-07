import { Module } from '@nestjs/common';
import { AuditModule } from '../../common/audit/audit.module';
import { ChargesModule } from '../charges/charges.module';
import { LedgerModule } from '../ledger/ledger.module';
import { LoanContractService } from './loan-contract.service';
import { LoansController } from './loans.controller';
import { LoansService } from './loans.service';

@Module({
  imports: [AuditModule, ChargesModule, LedgerModule],
  controllers: [LoansController],
  providers: [LoansService, LoanContractService],
})
export class LoansModule {}
