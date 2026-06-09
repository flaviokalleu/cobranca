import { Body, Controller, Get, Param, Post, Req } from '@nestjs/common';
import { IsString, MinLength } from 'class-validator';
import type { Request } from 'express';
import { Public } from '../../auth/decorators/public.decorator';
import { Roles } from '../../auth/decorators/roles.decorator';
import { PolicyAction, PolicyResource } from '../../auth/decorators/policy.decorator';
import { Tenant } from '../../common/tenant/tenant.decorator';
import { CustomerPortalService } from './customer-portal.service';

class CpfLoginDto {
  @IsString() @MinLength(11) document!: string;
}

@Controller()
export class CustomerPortalController {
  constructor(private readonly portal: CustomerPortalService) {}

  @Public()
  @Post('portal/auth/cpf')
  loginByCpf(@Body() dto: CpfLoginDto, @Req() req: Request) {
    const ip = (req.headers['x-forwarded-for'] as string)?.split(',')[0] ?? req.ip ?? '';
    return this.portal.loginByCpf(dto.document, ip);
  }

  @Roles('ADMIN', 'FINANCE', 'COMMERCIAL')
  @PolicyResource('CustomerPortal')
  @PolicyAction('create')
  @Post('customers/:customerId/portal-link')
  createLink(@Tenant() tenantId: string, @Param('customerId') customerId: string) {
    return this.portal.createToken(tenantId, customerId);
  }

  @Roles('ADMIN', 'FINANCE', 'COMMERCIAL')
  @PolicyResource('CustomerPortal')
  @PolicyAction('create')
  @Post('charges/:chargeId/portal-link')
  createChargeLink(@Tenant() tenantId: string, @Param('chargeId') chargeId: string) {
    return this.portal.createTokenFromCharge(tenantId, chargeId);
  }

  @Public()
  @Get('portal/:token')
  getPortal(@Param('token') token: string) {
    return this.portal.getPortal(token);
  }

  @Public()
  @Post('portal/:token/charges/:chargeId/pix')
  pix(@Param('token') token: string, @Param('chargeId') chargeId: string) {
    return this.portal.pix(token, chargeId);
  }

  @Public()
  @Get('portal/:token/charges/:chargeId/asaas-pix')
  asaasPixQrCode(@Param('token') token: string, @Param('chargeId') chargeId: string) {
    return this.portal.asaasPixQrCode(token, chargeId);
  }

  @Public()
  @Post('portal/:token/charges/:chargeId/sync')
  syncWithAsaas(@Param('token') token: string, @Param('chargeId') chargeId: string) {
    return this.portal.syncWithAsaas(token, chargeId);
  }
}
