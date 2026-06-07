import { randomUUID } from 'node:crypto';
import { Injectable, Logger, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { requestContext } from '../logging/request-context';

@Injectable()
export class RequestLoggerMiddleware implements NestMiddleware {
  private readonly logger = new Logger('HTTP');

  use(req: Request, res: Response, next: NextFunction): void {
    const startedAt = Date.now();
    const requestId = req.header('x-request-id') ?? randomUUID();
    res.setHeader('x-request-id', requestId);

    requestContext.run({ requestId }, () => {
      res.on('finish', () => {
        const request = req as Request & {
          tenantId?: string;
          user?: { sub?: string; tenantId?: string };
        };
        this.logger.log({
          requestId,
          method: req.method,
          path: req.originalUrl,
          tenantId: request.tenantId ?? request.user?.tenantId,
          userId: request.user?.sub,
          statusCode: res.statusCode,
          durationMs: Date.now() - startedAt,
        });
      });
      next();
    });
  }
}
