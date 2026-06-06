import { Body, Controller, Headers, Post } from '@nestjs/common';
import { WebhookService } from './webhook.service';
import { Public } from '../../auth/decorators/public.decorator';

@Controller('webhooks')
export class WebhookController {
  constructor(private readonly webhook: WebhookService) {}

  @Public()
  @Post('asaas')
  asaas(
    @Body() body: Record<string, unknown>,
    @Headers('asaas-access-token') _token: string,
  ) {
    return this.webhook.handleAsaas(body);
  }

  @Public()
  @Post('mercadopago')
  mercadopago(@Body() body: Record<string, unknown>) {
    return this.webhook.handleMercadoPago(body);
  }
}
