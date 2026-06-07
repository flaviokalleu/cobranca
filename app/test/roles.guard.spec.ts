import { ForbiddenException } from '@nestjs/common';
import { RolesGuard } from '../src/auth/guards/roles.guard';

function context(role?: string) {
  return {
    getHandler: () => 'handler',
    getClass: () => 'class',
    switchToHttp: () => ({
      getRequest: () => ({ user: role ? { role } : undefined }),
    }),
  };
}

describe('RolesGuard', () => {
  it('libera rota sem roles obrigatorias', () => {
    const reflector = { getAllAndOverride: jest.fn().mockReturnValue(undefined) };
    const guard = new RolesGuard(reflector as never);
    expect(guard.canActivate(context() as never)).toBe(true);
  });

  it('libera usuario com role permitida', () => {
    const reflector = { getAllAndOverride: jest.fn().mockReturnValue(['ADMIN']) };
    const guard = new RolesGuard(reflector as never);
    expect(guard.canActivate(context('ADMIN') as never)).toBe(true);
  });

  it('bloqueia usuario sem role permitida', () => {
    const reflector = { getAllAndOverride: jest.fn().mockReturnValue(['ADMIN']) };
    const guard = new RolesGuard(reflector as never);
    expect(() => guard.canActivate(context('USER') as never)).toThrow(ForbiddenException);
  });
});
