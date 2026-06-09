import { NotFoundException } from '@nestjs/common';
import { ChargesService } from '../src/modules/charges/charges.service';

function setup() {
  const customer = {
    id: 'customer-1',
    tenantId: 'tenant-a',
    name: 'Maria',
    phone: '5511999999999',
    whatsapp: null,
    email: 'maria@example.com',
    city: 'Sao Paulo',
    stage: 'LEAD',
  };
  const charge = {
    id: 'charge-1',
    tenantId: 'tenant-a',
    customerId: customer.id,
    amountCents: 5000,
    description: 'Mensalidade',
    dueDate: new Date('2026-07-10'),
    status: 'PENDING',
    recurrence: 'ONCE',
    nextDueAt: null,
    publicToken: 'public-token',
    interestMode: 'NONE',
    interestRateBps: 0,
    interestGraceDays: 0,
  };
  const prisma = {
    customer: { findFirst: jest.fn().mockResolvedValue(customer) },
    charge: {
      create: jest.fn().mockResolvedValue(charge),
      findFirst: jest.fn().mockResolvedValue(charge),
      update: jest.fn().mockResolvedValue({ ...charge, status: 'PAID' }),
    },
    lead: {
      findFirst: jest.fn().mockResolvedValue(null),
      create: jest.fn().mockResolvedValue({ id: 'lead-1' }),
    },
    calendarEvent: {
      findFirst: jest.fn().mockResolvedValue(null),
      create: jest.fn().mockResolvedValue({ id: 'event-1' }),
      update: jest.fn().mockResolvedValue({ id: 'event-1' }),
    },
  };
  const ledger = { post: jest.fn().mockResolvedValue(undefined) };
  const audit = { record: jest.fn().mockResolvedValue(undefined) };
  const queue = { enqueue: jest.fn() };
  const events = { emit: jest.fn() };
  const pix = { buildCopyPaste: jest.fn().mockReturnValue('pix-code') };
  const settings = {
    get: jest.fn().mockResolvedValue({
      pixKey: 'demo@pix',
      merchantName: 'Demo',
      merchantCity: 'Sao Paulo',
      nfeEnabled: false,
    }),
  };
  const whatsapp = { sendText: jest.fn().mockResolvedValue(undefined) };
  const nfe = { emitForCharge: jest.fn().mockResolvedValue(undefined) };
  const push = { notifyTenant: jest.fn().mockResolvedValue({ sent: 0 }) };
  const asaas = { isEnabled: jest.fn().mockResolvedValue(false), syncCharge: jest.fn() };
  const service = new ChargesService(
    prisma as never,
    ledger as never,
    audit as never,
    queue as never,
    pix as never,
    settings as never,
    events as never,
    whatsapp as never,
    nfe as never,
    push as never,
    asaas as never,
  );
  return { service, prisma, ledger, audit, queue, events, charge, push };
}

describe('ChargesService', () => {
  it('cria cobranca, contabiliza, cria lead e enfileira lembrete', async () => {
    const { service, prisma, ledger, queue } = setup();
    await service.create('tenant-a', {
      customerId: 'customer-1',
      amountCents: 5000,
      description: 'Mensalidade',
      dueDate: '2026-07-10',
    });

    expect(prisma.customer.findFirst).toHaveBeenCalledWith({
      where: { id: 'customer-1', tenantId: 'tenant-a' },
    });
    expect(ledger.post).toHaveBeenCalled();
    expect(prisma.lead.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ tenantId: 'tenant-a' }) }),
    );
    expect(queue.enqueue).toHaveBeenCalled();
  });

  it('nao cria cobranca para cliente de outro tenant', async () => {
    const { service, prisma } = setup();
    prisma.customer.findFirst.mockResolvedValue(null);
    await expect(
      service.create('tenant-b', {
        customerId: 'customer-1',
        amountCents: 5000,
        description: 'Mensalidade',
        dueDate: '2026-07-10',
      }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('baixa pagamento com partida dobrada e emite evento em tempo real', async () => {
    const { service, ledger, events } = setup();
    await service.pay('tenant-a', 'charge-1');

    expect(ledger.post).toHaveBeenCalledWith(
      'tenant-a',
      'payment:charge-1',
      expect.arrayContaining([
        expect.objectContaining({ accountCode: 'CASH', direction: 'DEBIT' }),
        expect.objectContaining({ accountCode: 'ACCOUNTS_RECEIVABLE', direction: 'CREDIT' }),
      ]),
    );
    expect(events.emit).toHaveBeenCalledWith(
      'notification.realtime',
      expect.objectContaining({ tenantId: 'tenant-a', type: 'charge.paid' }),
    );
  });
});
