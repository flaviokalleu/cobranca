import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Request } from 'express';
import { AppAction, AppSubject } from '../ability/ability.types';
import { AbilityFactory } from '../ability/ability.factory';
import {
  POLICY_ACTION_KEY,
  POLICY_RESOURCE_KEY,
} from '../decorators/policy.decorator';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';
import { JwtUser } from '../jwt-user.interface';

@Injectable()
export class AbacGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly abilityFactory: AbilityFactory,
  ) {}

  canActivate(ctx: ExecutionContext): boolean {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      ctx.getHandler(),
      ctx.getClass(),
    ]);
    if (isPublic) {
      return true;
    }

    const subject = this.reflector.getAllAndOverride<AppSubject | undefined>(
      POLICY_RESOURCE_KEY,
      [ctx.getHandler(), ctx.getClass()],
    );
    if (!subject) {
      return true;
    }

    const request = ctx.switchToHttp().getRequest<Request & { user?: JwtUser }>();
    const user = request.user;
    if (!user) {
      throw new ForbiddenException('Usuario nao autenticado para politica de acesso.');
    }

    const action =
      this.reflector.getAllAndOverride<AppAction | undefined>(POLICY_ACTION_KEY, [
        ctx.getHandler(),
        ctx.getClass(),
      ]) ?? this.actionFromMethod(request.method);
    const ability = this.abilityFactory.createForUser(user);

    if (!ability.can(action, subject) && !ability.can('manage', subject)) {
      throw new ForbiddenException('Politica de acesso nao permite esta acao.');
    }

    return true;
  }

  private actionFromMethod(method: string): AppAction {
    if (method === 'GET') return 'read';
    if (method === 'POST') return 'create';
    if (method === 'PATCH' || method === 'PUT') return 'update';
    if (method === 'DELETE') return 'delete';
    return 'read';
  }
}
