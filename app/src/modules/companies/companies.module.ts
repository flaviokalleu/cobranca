import { Module } from '@nestjs/common';
import { CompaniesController } from './companies.controller';
import { CompanyActivationService } from './company-activation.service';
import { CompanyResolverService } from './company-resolver.service';
import { WhatsappUserService } from './whatsapp-user.service';

@Module({
  controllers: [CompaniesController],
  providers: [CompanyActivationService, CompanyResolverService, WhatsappUserService],
  exports: [CompanyActivationService, CompanyResolverService, WhatsappUserService],
})
export class CompaniesModule {}
