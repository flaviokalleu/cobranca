import { Global, Module } from '@nestjs/common';
import { AsaasGatewayService } from './asaas-gateway.service';

@Global()
@Module({
  providers: [AsaasGatewayService],
  exports: [AsaasGatewayService],
})
export class AsaasGatewayModule {}
