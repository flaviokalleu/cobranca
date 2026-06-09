import { api } from '@/lib/http-client';

export interface ActivationCode {
  reference: string;
  code?: string;
  codePrefix: string;
  role: string;
  permissions: string[];
  maxUses: number;
  usedCount: number;
  expiresAt: string | null;
  status: string;
  createdAt: string;
  revokedAt?: string | null;
}

export interface CreateActivationCodeInput {
  role?: string;
  permissions?: string[];
  maxUses?: number;
  expiresAt?: string;
}

async function request<T>(method: string, path: string, body?: unknown): Promise<T> {
  const { status, data } = await api<T & { message?: string }>(method, path, body);
  if (status >= 300) throw new Error(data.message ?? 'Nao foi possivel concluir a acao.');
  return data;
}

export function listActivationCodes(companyRef: string) {
  return request<ActivationCode[]>('GET', `/companies/${companyRef}/activation-codes`);
}

export function createActivationCode(companyRef: string, body: CreateActivationCodeInput) {
  return request<ActivationCode>('POST', `/companies/${companyRef}/activation-codes`, body);
}

export function revokeActivationCode(companyRef: string, reference: string) {
  return request<ActivationCode>(
    'POST',
    `/companies/${companyRef}/activation-codes/${reference}/revoke`,
  );
}
