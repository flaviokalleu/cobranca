import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { parse } from 'csv-parse/sync';
import { stringify } from 'csv-stringify/sync';
import { PrismaService } from '../../common/prisma/prisma.service';
import { AuditService } from '../../common/audit/audit.service';
import { CreateCustomerDto } from './dto/create-customer.dto';
import { UpdateCustomerDto } from './dto/update-customer.dto';
import {
  paginated,
  paginationArgs,
  PaginationDto,
} from '../../common/dto/pagination.dto';

@Injectable()
export class CustomersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly events: EventEmitter2,
  ) {}

  async create(tenantId: string, dto: CreateCustomerDto) {
    const document = this.normalizeDocument(dto.document);
    const { customer, lead } = await this.prisma.$transaction(async (db) => {
      const customer = await db.customer.create({
        data: {
          tenantId,
          name: dto.name,
          document,
          phone: dto.phone,
          whatsapp: dto.whatsapp ?? null,
          email: dto.email ?? null,
          address: dto.address ?? null,
          city: dto.city ?? null,
          profession: dto.profession ?? null,
          incomeCents: dto.incomeCents ?? null,
          stage: dto.stage ?? 'LEAD',
        },
      });
      const lead = await db.lead.create({
        data: {
          tenantId,
          customerId: customer.id,
          name: customer.name,
          document: customer.document,
          phone: customer.phone,
          whatsapp: customer.whatsapp,
          email: customer.email,
          city: customer.city,
          profession: customer.profession,
          incomeCents: customer.incomeCents,
          stage: customer.stage,
        },
      });
      return { customer, lead };
    });

    await this.audit.record({
      tenantId,
      actor: 'system',
      action: 'CUSTOMER_CREATED',
      entityType: 'Customer',
      entityId: customer.id,
    });
    this.events.emit('notification.realtime', {
      tenantId,
      type: 'lead.created',
      payload: { leadId: lead.id, name: lead.name, customerId: customer.id },
    });

    return customer;
  }

  /// Sempre filtra por tenantId — nunca vaza dados entre empresas.
  async list(tenantId: string, query: PaginationDto) {
    const { skip, take } = paginationArgs(query);
    const search = query.search?.trim();
    const where = {
      tenantId,
      ...(search
        ? {
            OR: [
              { name: { contains: search, mode: 'insensitive' as const } },
              { document: { contains: search, mode: 'insensitive' as const } },
              { phone: { contains: search, mode: 'insensitive' as const } },
              { email: { contains: search, mode: 'insensitive' as const } },
            ],
          }
        : {}),
    };
    const [data, total] = await this.prisma.$transaction([
      this.prisma.customer.findMany({ where, orderBy: { createdAt: 'desc' }, skip, take }),
      this.prisma.customer.count({ where }),
    ]);
    return paginated(data, total, query);
  }

  async get(tenantId: string, id: string) {
    const customer = await this.prisma.customer.findFirst({ where: { tenantId, id } });
    if (!customer) throw new NotFoundException('Cliente nao encontrado.');
    const [charges, documents, calendar, leads, loans] = await Promise.all([
      this.prisma.charge.findMany({
        where: { tenantId, customerId: id },
        orderBy: { dueDate: 'desc' },
        take: 20,
      }),
      this.prisma.customerDocument.findMany({
        where: { tenantId, customerId: id },
        orderBy: { createdAt: 'desc' },
        take: 20,
      }),
      this.prisma.calendarEvent.findMany({
        where: { tenantId, customerId: id },
        orderBy: { startsAt: 'desc' },
        take: 20,
      }),
      this.prisma.lead.findMany({
        where: { tenantId, customerId: id },
        orderBy: { createdAt: 'desc' },
        take: 10,
      }),
      this.prisma.loan.findMany({
        where: { tenantId, customerId: id },
        orderBy: { createdAt: 'desc' },
        include: { installmentsList: true },
        take: 10,
      }),
    ]);
    return { customer, charges, documents, calendar, leads, loans, tasks: [] };
  }

  async update(tenantId: string, id: string, dto: UpdateCustomerDto) {
    const existing = await this.prisma.customer.findFirst({
      where: { id, tenantId },
    });
    if (!existing) throw new NotFoundException('Cliente não encontrado.');
    const data = {
      ...dto,
      document:
        dto.document === undefined ? undefined : this.normalizeDocument(dto.document),
    };
    const customer = await this.prisma.customer.update({
      where: { id: existing.id },
      data, // campos undefined sao ignorados pelo Prisma
    });
    await this.audit.record({
      tenantId,
      actor: 'system',
      action: 'CUSTOMER_UPDATED',
      entityType: 'Customer',
      entityId: customer.id,
    });
    return customer;
  }

  async exportCsv(tenantId: string): Promise<string> {
    const customers = await this.prisma.customer.findMany({
      where: { tenantId },
      orderBy: { createdAt: 'desc' },
    });

    return stringify(
      customers.map((customer) => ({
        name: customer.name,
        document: customer.document ?? '',
        phone: customer.phone,
        whatsapp: customer.whatsapp ?? '',
        email: customer.email ?? '',
        address: customer.address ?? '',
        city: customer.city ?? '',
        profession: customer.profession ?? '',
        incomeCents: customer.incomeCents ?? '',
        stage: customer.stage,
        createdAt: customer.createdAt.toISOString(),
      })),
      { header: true },
    );
  }

  async importCsv(tenantId: string, content: string) {
    const rows = this.parseCsv(content);
    const errors: Array<{ row: number; message: string }> = [];
    let imported = 0;
    let updated = 0;

    for (const [index, row] of rows.entries()) {
      try {
        const dto = this.rowToCustomerDto(row);
        const existing = await this.findExistingFromImport(tenantId, dto);
        if (existing) {
          await this.update(tenantId, existing.id, dto);
          updated += 1;
        } else {
          await this.create(tenantId, dto);
          imported += 1;
        }
      } catch (error) {
        errors.push({
          row: index + 2,
          message: error instanceof Error ? error.message : 'Linha invalida.',
        });
      }
    }

    await this.audit.record({
      tenantId,
      actor: 'system',
      action: 'CUSTOMERS_CSV_IMPORTED',
      entityType: 'Customer',
      entityId: tenantId,
      metadata: { imported, updated, errors: errors.length },
    });

    return { imported, updated, skipped: errors.length, errors };
  }

  async remove(tenantId: string, id: string) {
    const existing = await this.prisma.customer.findFirst({
      where: { id, tenantId },
    });
    if (!existing) throw new NotFoundException('Cliente não encontrado.');
    const [charges, salesOrders] = await Promise.all([
      this.prisma.charge.findMany({
        where: { tenantId, customerId: existing.id },
        select: { id: true },
      }),
      this.prisma.salesOrder.findMany({
        where: { tenantId, customerId: existing.id },
        select: { id: true, chargeId: true },
      }),
    ]);
    const chargeIds = [
      ...new Set([
        ...charges.map((charge) => charge.id),
        ...salesOrders
          .map((order) => order.chargeId)
          .filter((chargeId): chargeId is string => !!chargeId),
      ]),
    ];
    const orderIds = salesOrders.map((order) => order.id);
    const stockMovements = orderIds.length
      ? await this.prisma.stockMovement.findMany({
          where: { tenantId, refType: 'SALE', refId: { in: orderIds } },
        })
      : [];

    await this.prisma.$transaction(async (db) => {
      for (const movement of stockMovements) {
        const signedQty = movement.type === 'IN' ? movement.qty : -movement.qty;
        await db.product.updateMany({
          where: { id: movement.productId, tenantId },
          data: { stockQty: { increment: -signedQty } },
        });
      }
      if (orderIds.length) {
        await db.stockMovement.deleteMany({
          where: { tenantId, refType: 'SALE', refId: { in: orderIds } },
        });
        await db.salesOrderItem.deleteMany({
          where: { tenantId, orderId: { in: orderIds } },
        });
        await db.notification.deleteMany({
          where: {
            tenantId,
            entityType: 'SalesOrder',
            entityId: { in: orderIds },
          },
        });
        await db.salesOrder.deleteMany({
          where: { tenantId, id: { in: orderIds } },
        });
      }
      if (chargeIds.length) {
        await db.calendarEvent.deleteMany({
          where: { tenantId, chargeId: { in: chargeIds } },
        });
        await db.notification.deleteMany({
          where: {
            tenantId,
            entityType: 'Charge',
            entityId: { in: chargeIds },
          },
        });
        await db.ledgerEntry.deleteMany({
          where: {
            tenantId,
            transactionId: {
              in: chargeIds.flatMap((chargeId) => [
                `charge:${chargeId}`,
                `payment:${chargeId}`,
              ]),
            },
          },
        });
        await db.charge.deleteMany({
          where: { tenantId, id: { in: chargeIds } },
        });
      }
      await db.calendarEvent.deleteMany({
        where: { tenantId, customerId: existing.id },
      });
      await db.notification.deleteMany({
        where: { tenantId, entityType: 'Customer', entityId: existing.id },
      });
      await db.customerDocument.deleteMany({
        where: { tenantId, customerId: existing.id },
      });
      await db.customer.delete({ where: { id: existing.id } });
    });
    await this.audit.record({
      tenantId,
      actor: 'system',
      action: 'CUSTOMER_DELETED',
      entityType: 'Customer',
      entityId: id,
      metadata: {
        deletedCharges: chargeIds.length,
        deletedSalesOrders: orderIds.length,
        revertedStockMovements: stockMovements.length,
      },
    });
    return { ok: true };
  }

  async bulkRemove(tenantId: string, ids: string[]) {
    let deleted = 0;
    for (const id of ids) {
      const exists = await this.prisma.customer.findFirst({
        where: { tenantId, id },
        select: { id: true },
      });
      if (!exists) continue;
      await this.remove(tenantId, id);
      deleted += 1;
    }
    return { ok: true, deleted };
  }

  private parseCsv(content: string): Array<Record<string, string>> {
    try {
      return parse(content.replace(/^\uFEFF/, ''), {
        columns: true,
        skip_empty_lines: true,
        trim: true,
      }) as Array<Record<string, string>>;
    } catch {
      throw new BadRequestException('CSV invalido ou sem cabecalho.');
    }
  }

  private rowToCustomerDto(row: Record<string, string>): CreateCustomerDto {
    const name = this.pick(row, 'name', 'nome');
    const phone = this.normalizePhone(this.pick(row, 'phone', 'telefone', 'celular'));
    if (!name || name.length < 2) {
      throw new BadRequestException('Nome do cliente e obrigatorio.');
    }
    if (!phone) {
      throw new BadRequestException('Telefone do cliente deve ter 10 a 15 digitos.');
    }

    const document = this.normalizeDocument(
      this.optional(this.pick(row, 'document', 'documento', 'cpf', 'cnpj')),
    );

    return {
      name,
      document: document ?? undefined,
      phone,
      whatsapp: this.normalizePhone(this.pick(row, 'whatsapp', 'zap')) ?? undefined,
      email: this.optional(this.pick(row, 'email', 'e-mail')),
      address: this.optional(this.pick(row, 'address', 'endereco')),
      city: this.optional(this.pick(row, 'city', 'cidade')),
      profession: this.optional(this.pick(row, 'profession', 'profissao')),
      incomeCents: this.toInt(this.pick(row, 'incomeCents', 'rendaCentavos')),
      stage: this.optional(this.pick(row, 'stage', 'etapa')),
    };
  }

  private async findExistingFromImport(tenantId: string, dto: CreateCustomerDto) {
    return this.prisma.customer.findFirst({
      where: {
        tenantId,
        OR: [
          ...(dto.document ? [{ document: dto.document }] : []),
          { phone: dto.phone },
          ...(dto.whatsapp ? [{ whatsapp: dto.whatsapp }] : []),
          ...(dto.email ? [{ email: dto.email }] : []),
        ],
      },
      select: { id: true },
    });
  }

  private pick(row: Record<string, string>, ...keys: string[]): string {
    const normalized = new Map(
      Object.entries(row).map(([key, value]) => [this.normalizeKey(key), value?.trim() ?? '']),
    );
    for (const key of keys) {
      const value = normalized.get(this.normalizeKey(key));
      if (value) return value;
    }
    return '';
  }

  private normalizeKey(value: string): string {
    return value
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase();
  }

  private normalizePhone(value: string): string | undefined {
    const digits = value.replace(/\D/g, '');
    if (digits.length < 10 || digits.length > 15) return undefined;
    return value.trim().startsWith('+') ? `+${digits}` : digits;
  }

  private normalizeDocument(value?: string): string | null {
    if (!value?.trim()) return null;
    const digits = value.replace(/\D/g, '');
    if (digits.length === 11 && this.isValidCpf(digits)) return digits;
    if (digits.length === 14 && this.isValidCnpj(digits)) return digits;
    throw new BadRequestException('CPF/CNPJ invalido.');
  }

  private isValidCpf(cpf: string): boolean {
    if (!/^\d{11}$/.test(cpf) || /^(\d)\1+$/.test(cpf)) return false;
    const calc = (factor: number) => {
      let sum = 0;
      for (let index = 0; index < factor - 1; index += 1) {
        sum += Number(cpf[index]) * (factor - index);
      }
      const rest = (sum * 10) % 11;
      return rest === 10 ? 0 : rest;
    };
    return calc(10) === Number(cpf[9]) && calc(11) === Number(cpf[10]);
  }

  private isValidCnpj(cnpj: string): boolean {
    if (!/^\d{14}$/.test(cnpj) || /^(\d)\1+$/.test(cnpj)) return false;
    const calc = (length: number) => {
      const weights =
        length === 12
          ? [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]
          : [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
      const sum = weights.reduce((acc, weight, index) => acc + Number(cnpj[index]) * weight, 0);
      const rest = sum % 11;
      return rest < 2 ? 0 : 11 - rest;
    };
    return calc(12) === Number(cnpj[12]) && calc(13) === Number(cnpj[13]);
  }

  private optional(value: string): string | undefined {
    return value.trim() || undefined;
  }

  private toInt(value: string): number | undefined {
    if (!value.trim()) return undefined;
    const parsed = Number.parseInt(value.replace(/\D/g, ''), 10);
    return Number.isFinite(parsed) ? parsed : undefined;
  }
}
