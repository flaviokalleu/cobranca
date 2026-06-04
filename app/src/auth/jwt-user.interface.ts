export type Role = 'ADMIN' | 'AGENT' | 'SUPERADMIN';

/// Conteudo do JWT, anexado a requisicao apos autenticacao.
export interface JwtUser {
  sub: string; // userId
  tenantId: string;
  role: Role;
  email: string;
}
