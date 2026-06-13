import { ReminderProcessor } from '../src/modules/reminders/reminder.processor';

describe('ReminderProcessor', () => {
  it('monta PIX, envia WhatsApp e tenta e-mail quando cliente possui endereco', async () => {
    let handler: ((payload: Record<string, unknown>) => Promise<void>) | undefined;
    const queue = {
      register: jest.fn((_name, callback) => {
        handler = callback;
      }),
    };
    const sender = { send: jest.fn().mockResolvedValue(undefined) };
    const pix = { buildCopyPaste: jest.fn().mockReturnValue('PIX-CODE') };
    const settings = {
      get: jest.fn().mockResolvedValue({
        pixKey: 'pix@example.com',
        merchantName: 'Empresa',
        merchantCity: 'Sao Paulo',
        chargeRobotEnabled: true,
        notifyByWhatsapp: true,
      }),
    };
    const prisma = {
      charge: {
        findFirst: jest.fn().mockResolvedValue({
          customer: { email: 'maria@example.com', name: 'Maria' },
        }),
      },
      notification: { create: jest.fn().mockResolvedValue({ id: 'notification-1' }) },
    };
    const mail = {
      sendChargeReminder: jest.fn().mockResolvedValue({ sent: true }),
    };
    const processor = new ReminderProcessor(
      queue as never,
      sender as never,
      pix as never,
      settings as never,
      prisma as never,
      mail as never,
    );
    processor.onModuleInit();

    await handler?.({
      tenantId: 'tenant-a',
      chargeId: 'charge-1',
      customerName: 'Maria',
      phone: '5511999999999',
      amountCents: 5000,
      dueDate: '2026-07-10T00:00:00.000Z',
    });

    expect(sender.send).toHaveBeenCalledWith(expect.objectContaining({ pixCopyPaste: 'PIX-CODE' }));
    expect(mail.sendChargeReminder).toHaveBeenCalledWith(
      'maria@example.com',
      expect.objectContaining({ customerName: 'Maria', pixCode: 'PIX-CODE' }),
    );
    expect(prisma.notification.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ status: 'SENT' }) }),
    );
  });
});
