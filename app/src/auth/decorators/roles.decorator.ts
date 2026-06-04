import { SetMetadata } from '@nestjs/common';
import { Role } from '../jwt-user.interface';

export const ROLES_KEY = 'roles';

/// Restringe uma rota aos papeis informados (RBAC).
export const Roles = (...roles: Role[]) => SetMetadata(ROLES_KEY, roles);
