import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { Request } from 'express';
import { PrismaService } from '../../common/prisma/prisma.service';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';
import { JwtUser } from '../jwt-user.interface';

/**
 * Exige um JWT valido (Bearer). Em rotas @Public(), libera sem token.
 * O tenant vem SEMPRE do token. Bloqueia se a empresa estiver suspensa.
 */
@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly jwt: JwtService,
    private readonly reflector: Reflector,
    private readonly prisma: PrismaService,
  ) {}

  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      ctx.getHandler(),
      ctx.getClass(),
    ]);
    if (isPublic) {
      return true;
    }

    const req = ctx
      .switchToHttp()
      .getRequest<Request & { user?: JwtUser; tenantId?: string }>();
    const header = req.headers['authorization'];
    if (!header || !header.startsWith('Bearer ')) {
      throw new UnauthorizedException('Token de acesso ausente.');
    }

    let payload: JwtUser;
    try {
      payload = await this.jwt.verifyAsync<JwtUser>(header.slice(7));
    } catch {
      throw new UnauthorizedException('Token de acesso invalido ou expirado.');
    }

    req.user = payload;
    req.tenantId = payload.tenantId;

    // Bloqueia acesso de empresa suspensa (superadmin/plataforma nao e afetado).
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: payload.tenantId },
    });
    if (tenant && tenant.status === 'SUSPENDED') {
      throw new ForbiddenException('Empresa suspensa. Contate o suporte.');
    }

    return true;
  }
}
