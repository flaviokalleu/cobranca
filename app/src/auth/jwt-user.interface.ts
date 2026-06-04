export type Role =
  | 'ADMIN'
  | 'FINANCE'
  | 'COMMERCIAL'
  | 'OPERATIONS'
  | 'USER'
  | 'AGENT'
  | 'SUPERADMIN';

/// Conteudo do JWT, anexado a requisicao apos autenticacao.
export interface JwtUser {
  sub: string; // userId
  tenantId: string;
  role: Role;
  email: string;
}
