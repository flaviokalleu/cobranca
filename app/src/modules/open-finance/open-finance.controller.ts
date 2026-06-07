import { Body, Controller, Delete, Get, Headers, Param, Post, Query, UnauthorizedException, RawBodyRequest, Req } from '@nestjs/common';
import { Request } from 'express';
import * as crypto from 'crypto';
import { ConfigService } from '@nestjs/config';
import { Public } from '../../auth/decorators/public.decorator';
import { Roles } from '../../auth/decorators/roles.decorator';
import { PolicyResource } from '../../auth/decorators/policy.decorator';
import { Tenant } from '../../common/tenant/tenant.decorator';
import { OpenFinanceService } from './open-finance.service';
import { CreateConnectTokenDto, ItemWebhookDto, ListTransactionsDto } from './dto/open-finance.dto';

@PolicyResource('OpenFinance')
@Controller('open-finance')
export class OpenFinanceController {
  constructor(
    private readonly service: OpenFinanceService,
    private readonly config: ConfigService,
  ) {}

  @Roles('ADMIN', 'FINANCE')
  @Get('summary')
  summary(@Tenant() tenantId: string) {
    return this.service.getSummary(tenantId);
  }

  @Roles('ADMIN', 'FINANCE')
  @Post('connect-token')
  connectToken(@Tenant() tenantId: string, @Body() dto: CreateConnectTokenDto) {
    return this.service.createConnectToken(tenantId, dto.itemId);
  }

  @Roles('ADMIN', 'FINANCE')
  @Get('connections')
  listConnections(@Tenant() tenantId: string) {
    return this.service.listConnections(tenantId);
  }

  @Roles('ADMIN', 'FINANCE')
  @Delete('connections/:id')
  deleteConnection(@Tenant() tenantId: string, @Param('id') id: string) {
    return this.service.deleteConnection(tenantId, id);
  }

  @Roles('ADMIN', 'FINANCE')
  @Get('accounts')
  listAccounts(@Tenant() tenantId: string) {
    return this.service.listAccounts(tenantId);
  }

  @Roles('ADMIN', 'FINANCE')
  @Get('transactions')
  listTransactions(@Tenant() tenantId: string, @Query() dto: ListTransactionsDto) {
    return this.service.listTransactions(tenantId, dto);
  }

  /** Pluggy webhooks — public endpoint, validado via HMAC quando configurado */
  @Public()
  @Post('webhook')
  async webhook(
    @Body() body: ItemWebhookDto,
    @Headers('x-pluggy-tenant') tenantHeader?: string,
    @Headers('x-pluggy-signature') signature?: string,
    @Req() req?: RawBodyRequest<Request>,
  ) {
    const secret = this.config.get<string>('PLUGGY_WEBHOOK_SECRET');
    if (secret && signature) {
      const rawBody = req?.rawBody ?? Buffer.from(JSON.stringify(body));
      const expected = crypto
        .createHmac('sha256', secret)
        .update(rawBody)
        .digest('hex');
      if (!crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected))) {
        throw new UnauthorizedException('Assinatura de webhook invalida.');
      }
    }
    await this.service.handleWebhook(tenantHeader ?? 'unknown', body.itemId, body.event, body.status);
    return { ok: true };
  }
}
