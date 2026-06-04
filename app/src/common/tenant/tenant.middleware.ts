import { Injectable, NestMiddleware, BadRequestException } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';

/**
 * Isolamento multi-tenant.
 * Le o header `x-tenant-id` e o anexa a requisicao. Sem tenant, a requisicao e barrada.
 * (Em producao isto viria do JWT/sessao; o header mantem a fatia simples de testar.)
 */
@Injectable()
export class TenantMiddleware implements NestMiddleware {
  use(req: Request, _res: Response, next: NextFunction): void {
    const tenantId = req.header('x-tenant-id');
    if (!tenantId || tenantId.trim() === '') {
      throw new BadRequestException(
        'Header x-tenant-id e obrigatorio (isolamento multi-tenant).',
      );
    }
    (req as Request & { tenantId?: string }).tenantId = tenantId.trim();
    next();
  }
}
