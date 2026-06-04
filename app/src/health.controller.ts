import { Controller, Get } from '@nestjs/common';
import { Public } from './auth/decorators/public.decorator';

/// Rota publica de verificacao (nao exige token nem tenant).
@Controller('health')
export class HealthController {
  @Public()
  @Get()
  check(): { status: string; service: string; time: string } {
    return {
      status: 'ok',
      service: 'cobranca-api',
      time: new Date().toISOString(),
    };
  }
}
