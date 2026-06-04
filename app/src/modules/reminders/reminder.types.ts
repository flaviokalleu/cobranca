/// Nome do job de lembrete na fila.
export const REMINDER_JOB = 'charge.reminder';

/// Dados que viajam na fila para gerar um lembrete de cobranca.
export interface ReminderJobPayload {
  tenantId: string;
  chargeId: string;
  customerName: string;
  phone: string;
  amountCents: number;
  dueDate: string;
}
