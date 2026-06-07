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
import { requestContext } from '../../common/logging/request-context';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';
import { JwtUser, Role } from '../jwt-user.interface';

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

    // Bloqueia acesso de empresa suspensa (superadmin/plataforma nao e afetado).
    const [tenant, user] = await Promise.all([
      this.prisma.tenant.findUnique({
        where: { id: payload.tenantId },
      }),
      this.prisma.user.findFirst({
        where: { id: payload.sub, tenantId: payload.tenantId },
        select: { id: true, tenantId: true, email: true, role: true },
      }),
    ]);
    if (tenant && tenant.status === 'SUSPENDED') {
      throw new ForbiddenException('Empresa suspensa. Contate o suporte.');
    }

    // Bloqueia acesso se assinatura vencida (exceto ADMIN que pode reativar)
    if (payload.role !== 'ADMIN' && payload.role !== 'SUPERADMIN') {
      const sub = await this.prisma.subscription.findFirst({
        where: { tenantId: payload.tenantId },
        select: { status: true },
      });
      if (sub?.status === 'CANCELED' || sub?.status === 'PAST_DUE') {
        throw new ForbiddenException('Assinatura inativa. Contate o administrador da conta.');
      }
    }
    if (!user) {
      throw new UnauthorizedException('Usuario nao encontrado ou removido.');
    }

    req.user = {
      sub: user.id,
      tenantId: user.tenantId,
      role: user.role as Role,
      email: user.email,
    };
    req.tenantId = user.tenantId;

    const context = requestContext.getStore();
    if (context) {
      context.tenantId = user.tenantId;
      context.userId = user.id;
    }

    return true;
  }
}
