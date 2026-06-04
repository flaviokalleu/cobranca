import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { Request } from 'express';
import { JwtUser } from '../jwt-user.interface';

/// Extrai o usuario autenticado (payload do JWT) da requisicao.
export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): JwtUser => {
    const req = ctx.switchToHttp().getRequest<Request & { user: JwtUser }>();
    return req.user;
  },
);
