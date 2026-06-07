import { Controller, Get } from '@nestjs/common';
import { Public } from './auth/decorators/public.decorator';
import { PrismaService } from './common/prisma/prisma.service';

/// Rota publica de verificacao (nao exige token nem tenant).
@Controller('health')
export class HealthController {
  constructor(private readonly prisma: PrismaService) {}

  @Public()
  @Get()
  async check(): Promise<{
    status: string;
    service: string;
    time: string;
    uptimeSeconds: number;
    database: string;
  }> {
    let database = 'ok';
    try {
      await this.prisma.$queryRaw`SELECT 1`;
    } catch {
      database = 'error';
    }

    return {
      status: database === 'ok' ? 'ok' : 'degraded',
      service: 'cobranca-api',
      time: new Date().toISOString(),
      uptimeSeconds: Math.round(process.uptime()),
      database,
    };
  }
}
