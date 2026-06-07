import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../../common/prisma/prisma.service';
import { AuditService } from '../../common/audit/audit.service';
import { PluggyClientService } from './pluggy-client.service';
import { ListTransactionsDto } from './dto/open-finance.dto';

@Injectable()
export class OpenFinanceService {
  private readonly logger = new Logger(OpenFinanceService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly pluggy: PluggyClientService,
  ) {}

  async createConnectToken(tenantId: string, itemId?: string): Promise<{ accessToken: string }> {
    if (itemId) {
      // Validate ownership
      await this.prisma.openFinanceConnection.findFirstOrThrow({ where: { tenantId, itemId } });
    }
    const accessToken = await this.pluggy.createConnectToken(itemId);
    return { accessToken };
  }

  async handleWebhook(_ignored: string, itemId: string, event: string, status?: string): Promise<void> {
    this.logger.log(`Webhook: event=${event} item=${itemId} status=${status}`);

    // Resolve tenant from existing connection or use system fallback
    const existing = await this.prisma.openFinanceConnection.findUnique({ where: { itemId } });

    if (event === 'item/error') {
      if (existing) {
        await this.prisma.openFinanceConnection.update({
          where: { id: existing.id },
          data: { status: 'ERROR', updatedAt: new Date() },
        });
      }
      return;
    }

    if (!['item/created', 'item/updated'].includes(event)) return;

    const pluggyItem = await this.pluggy.getItem(itemId);
    const tenantId = existing?.tenantId ?? 'unknown';

    const upsertData = {
      tenantId,
      itemId,
      connector: pluggyItem.connector.name,
      connectorId: pluggyItem.connector.id,
      status: pluggyItem.status,
      lastSyncAt: new Date(),
      updatedAt: new Date(),
    };

    const connection = await this.prisma.openFinanceConnection.upsert({
      where: { itemId },
      create: { ...upsertData, createdAt: new Date() },
      update: upsertData,
    });

    if (pluggyItem.status === 'UPDATED' && tenantId !== 'unknown') {
      await this.syncAccounts(connection.id, itemId, tenantId);
    }

    await this.audit.record({
      tenantId,
      actor: 'system',
      action: event,
      entityType: 'OpenFinanceConnection',
      entityId: connection.id,
    });
  }

  private async syncAccounts(connectionId: string, itemId: string, tenantId: string): Promise<void> {
    const accounts = await this.pluggy.getAccounts(itemId);

    for (const acc of accounts) {
      const balanceCents = this.pluggy.amountToCents(acc.balance);
      const creditLimitCents = acc.creditData?.creditLimit
        ? this.pluggy.amountToCents(acc.creditData.creditLimit)
        : null;

      const existing = await this.prisma.openFinanceBankAccount.findUnique({ where: { externalId: acc.id } });

      let accountId: string;
      if (existing) {
        await this.prisma.openFinanceBankAccount.update({
          where: { id: existing.id },
          data: { balanceCents, creditLimitCents, lastSyncAt: new Date(), updatedAt: new Date() },
        });
        accountId = existing.id;
      } else {
        const created = await this.prisma.openFinanceBankAccount.create({
          data: {
            tenantId,
            connectionId,
            externalId: acc.id,
            type: acc.type,
            subtype: acc.subtype,
            name: acc.name,
            number: acc.number,
            currency: acc.currencyCode ?? 'BRL',
            balanceCents,
            creditLimitCents,
            lastSyncAt: new Date(),
          },
        });
        accountId = created.id;
      }

      await this.syncTransactions(accountId, acc.id, tenantId);
    }
  }

  private async syncTransactions(accountId: string, externalAccountId: string, tenantId: string): Promise<void> {
    const last = await this.prisma.openFinanceTransaction.findFirst({
      where: { accountId },
      orderBy: { date: 'desc' },
    });

    const from = last ? last.date.toISOString().slice(0, 10) : undefined;
    const transactions = await this.pluggy.getTransactions(externalAccountId, from);

    for (const tx of transactions) {
      try {
        await this.prisma.openFinanceTransaction.upsert({
          where: { externalId: tx.id },
          create: {
            tenantId,
            accountId,
            externalId: tx.id,
            type: tx.type,
            amountCents: this.pluggy.amountToCents(Math.abs(tx.amount)),
            description: tx.description ?? tx.descriptionRaw ?? '',
            category: tx.category,
            date: new Date(tx.date),
            balance: tx.balance != null ? this.pluggy.amountToCents(tx.balance) : null,
            counterpartyName: tx.paymentData?.payer?.name ?? tx.paymentData?.receiver?.name,
            paymentMethod: tx.paymentData?.paymentMethod,
          },
          update: {
            category: tx.category,
            balance: tx.balance != null ? this.pluggy.amountToCents(tx.balance) : null,
          },
        });
      } catch {
        // skip duplicate
      }
    }
  }

  async listConnections(tenantId: string) {
    return this.prisma.openFinanceConnection.findMany({
      where: { tenantId },
      include: {
        accounts: {
          select: { id: true, name: true, type: true, subtype: true, balanceCents: true, currency: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async deleteConnection(tenantId: string, connectionId: string): Promise<void> {
    const conn = await this.prisma.openFinanceConnection.findFirst({ where: { tenantId, id: connectionId } });
    if (!conn) throw new NotFoundException('Connection not found');

    await this.pluggy.deleteItem(conn.itemId).catch((e) => this.logger.warn(`Pluggy delete failed: ${e.message}`));

    await this.prisma.openFinanceConnection.delete({ where: { id: connectionId } });
    await this.audit.record({
      tenantId,
      actor: 'user',
      action: 'DELETE',
      entityType: 'OpenFinanceConnection',
      entityId: connectionId,
    });
  }

  async listAccounts(tenantId: string) {
    return this.prisma.openFinanceBankAccount.findMany({
      where: { tenantId },
      include: {
        connection: { select: { connector: true, status: true } },
      },
      orderBy: { createdAt: 'asc' },
    });
  }

  async listTransactions(tenantId: string, dto: ListTransactionsDto) {
    const page = dto.page ?? 1;
    const limit = Math.min(dto.limit ?? 50, 200);
    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = { tenantId };
    if (dto.accountId) where.accountId = dto.accountId;
    if (dto.category) where.category = dto.category;
    if (dto.from || dto.to) {
      where.date = {
        ...(dto.from ? { gte: new Date(dto.from) } : {}),
        ...(dto.to ? { lte: new Date(dto.to) } : {}),
      };
    }

    const [total, items] = await Promise.all([
      this.prisma.openFinanceTransaction.count({ where }),
      this.prisma.openFinanceTransaction.findMany({
        where,
        include: { account: { select: { name: true, type: true, connection: { select: { connector: true } } } } },
        orderBy: { date: 'desc' },
        skip,
        take: limit,
      }),
    ]);

    return { total, page, limit, items };
  }

  async getSummary(tenantId: string) {
    const accounts = await this.prisma.openFinanceBankAccount.findMany({ where: { tenantId } });

    const totalBalanceCents = accounts
      .filter((a) => a.type === 'BANK')
      .reduce((s, a) => s + a.balanceCents, 0);

    const totalCreditCents = accounts
      .filter((a) => a.type === 'CREDIT')
      .reduce((s, a) => s + a.balanceCents, 0);

    const connections = await this.prisma.openFinanceConnection.count({ where: { tenantId } });
    const lastSync = await this.prisma.openFinanceConnection.findFirst({
      where: { tenantId },
      orderBy: { lastSyncAt: 'desc' },
      select: { lastSyncAt: true },
    });

    return { totalBalanceCents, totalCreditCents, connections, accounts: accounts.length, lastSyncAt: lastSync?.lastSyncAt };
  }

  @Cron(CronExpression.EVERY_6_HOURS)
  async scheduledSync(): Promise<void> {
    const stale = await this.prisma.openFinanceConnection.findMany({
      where: {
        status: 'UPDATED',
        OR: [{ lastSyncAt: null }, { lastSyncAt: { lt: new Date(Date.now() - 6 * 60 * 60 * 1000) } }],
      },
      take: 20,
    });

    for (const conn of stale) {
      try {
        await this.syncAccounts(conn.id, conn.itemId, conn.tenantId);
        await this.prisma.openFinanceConnection.update({
          where: { id: conn.id },
          data: { lastSyncAt: new Date() },
        });
        this.logger.log(`Synced connection ${conn.id} (${conn.connector})`);
      } catch (e) {
        this.logger.warn(`Sync failed for ${conn.id}: ${(e as Error).message}`);
      }
    }
  }
}
