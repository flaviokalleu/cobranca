import { Module } from '@nestjs/common';
import { AuthModule } from '../../auth/auth.module';
import { ChargesModule } from '../charges/charges.module';
import { CustomerPortalController } from './customer-portal.controller';
import { CustomerPortalService } from './customer-portal.service';

@Module({
  imports: [AuthModule, ChargesModule],
  controllers: [CustomerPortalController],
  providers: [CustomerPortalService],
})
export class CustomerPortalModule {}
