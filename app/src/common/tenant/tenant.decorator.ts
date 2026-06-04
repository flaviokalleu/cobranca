import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { Request } from 'express';

/// Extrai o tenantId que o TenantMiddleware anexou a requisicao.
export const Tenant = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): string => {
    const req = ctx.switchToHttp().getRequest<Request & { tenantId?: string }>();
    return req.tenantId as string;
  },
);
