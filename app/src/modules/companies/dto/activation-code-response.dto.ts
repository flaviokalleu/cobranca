export interface ActivationCodeResponseDto {
  reference: string;
  code?: string;
  codePrefix: string;
  role: string;
  permissions: string[];
  maxUses: number;
  usedCount: number;
  expiresAt: Date | null;
  status: string;
  createdAt: Date;
  revokedAt?: Date | null;
}
