import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { AuditService } from '../../common/audit/audit.service';
import { StockService } from '../stock/stock.service';
import { ChargesService } from '../charges/charges.service';
import { CreateSalesOrderDto } from './dto/create-sales-order.dto';
import { UpdateSalesOrderDto } from './dto/update-sales-order.dto';
import {
  paginated,
  paginationArgs,
  PaginationDto,
} from '../../common/dto/pagination.dto';

@Injectable()
export class SalesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly stock: StockService,
    private readonly charges: ChargesService,
    private readonly audit: AuditService,
  ) {}

  async create(tenantId: string, dto: CreateSalesOrderDto) {
    const customer = await this.prisma.customer.findFirst({
      where: { id: dto.customerId, tenantId },
    });
    if (!customer) throw new NotFoundException('Cliente não encontrado.');

    let total = 0;
    const itemsData: {
      tenantId: string;
      orderId: string;
      productId: string;
      qty: number;
      unitPriceCents: number;
      totalCents: number;
    }[] = [];

    const number = (await this.prisma.salesOrder.count({ where: { tenantId } })) + 1;
    const order = await this.prisma.salesOrder.create({
      data: {
        tenantId,
        number,
        customerId: customer.id,
        totalCents: 0,
        deliveryAt: dto.deliveryAt ? new Date(dto.deliveryAt) : null,
      },
    });

    for (const item of dto.items) {
      const product = await this.prisma.product.findFirst({
        where: { id: item.productId, tenantId },
      });
      if (!product) {
        throw new NotFoundException(`Produto não encontrado: ${item.productId}`);
      }
      const lineTotal = product.priceCents * item.qty;
      total += lineTotal;
      itemsData.push({
        tenantId,
        orderId: order.id,
        productId: product.id,
        qty: item.qty,
        unitPriceCents: product.priceCents,
        totalCents: lineTotal,
      });
    }

    await this.prisma.salesOrderItem.createMany({ data: itemsData });
    const updated = await this.prisma.salesOrder.update({
      where: { id: order.id },
      data: { totalCents: total },
    });
    await this.audit.record({
      tenantId,
      actor: 'system',
      action: 'SALE_CREATED',
      entityType: 'SalesOrder',
      entityId: order.id,
      metadata: { number, totalCents: total },
    });
    return updated;
  }

  async list(tenantId: string, query: PaginationDto) {
    const { skip, take } = paginationArgs(query);
    const search = query.search?.trim();
    const where = {
      tenantId,
      ...(search
        ? {
            OR: [
              { status: { contains: search, mode: 'insensitive' as const } },
              { customer: { name: { contains: search, mode: 'insensitive' as const } } },
            ],
          }
        : {}),
    };
    const orders = await this.prisma.salesOrder.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip,
      take,
    });
    const [items, total] = await Promise.all([
      this.prisma.salesOrderItem.findMany({
        where: { tenantId, orderId: { in: orders.map((order) => order.id) } },
      }),
      this.prisma.salesOrder.count({ where }),
    ]);
    const itemsByOrder = new Map<string, typeof items>();
    for (const item of items) {
      itemsByOrder.set(item.orderId, [...(itemsByOrder.get(item.orderId) ?? []), item]);
    }
    return paginated(
      orders.map((order) => ({
        ...order,
        items: itemsByOrder.get(order.id) ?? [],
      })),
      total,
      query,
    );
  }

  async update(tenantId: string, id: string, dto: UpdateSalesOrderDto) {
    const order = await this.prisma.salesOrder.findFirst({
      where: { id, tenantId },
    });
    if (!order) throw new NotFoundException('Pedido nao encontrado.');
    if (order.status !== 'DRAFT') {
      throw new BadRequestException('Somente pedidos em rascunho podem ser editados.');
    }
    if (dto.customerId) {
      const customer = await this.prisma.customer.findFirst({
        where: { id: dto.customerId, tenantId },
      });
      if (!customer) throw new NotFoundException('Cliente nao encontrado.');
    }

    let total = order.totalCents;
    const itemsData: {
      tenantId: string;
      orderId: string;
      productId: string;
      qty: number;
      unitPriceCents: number;
      totalCents: number;
    }[] = [];

    if (dto.items) {
      total = 0;
      for (const item of dto.items) {
        const product = await this.prisma.product.findFirst({
          where: { id: item.productId, tenantId, active: true },
        });
        if (!product) throw new NotFoundException(`Produto nao encontrado: ${item.productId}`);
        const lineTotal = product.priceCents * item.qty;
        total += lineTotal;
        itemsData.push({
          tenantId,
          orderId: order.id,
          productId: product.id,
          qty: item.qty,
          unitPriceCents: product.priceCents,
          totalCents: lineTotal,
        });
      }
    }

    const updated = await this.prisma.$transaction(async (db) => {
      if (dto.items) {
        await db.salesOrderItem.deleteMany({ where: { orderId: order.id } });
        await db.salesOrderItem.createMany({ data: itemsData });
      }
      return db.salesOrder.update({
        where: { id: order.id },
        data: {
          customerId: dto.customerId,
          totalCents: total,
          deliveryAt: dto.deliveryAt ? new Date(dto.deliveryAt) : undefined,
        },
      });
    });

    await this.audit.record({
      tenantId,
      actor: 'system',
      action: 'SALE_UPDATED',
      entityType: 'SalesOrder',
      entityId: order.id,
      metadata: { totalCents: updated.totalCents },
    });
    return updated;
  }

  async remove(tenantId: string, id: string) {
    const order = await this.prisma.salesOrder.findFirst({
      where: { id, tenantId },
    });
    if (!order) throw new NotFoundException('Pedido nao encontrado.');
    const stockMovements = await this.prisma.stockMovement.findMany({
      where: { tenantId, refType: 'SALE', refId: order.id },
    });
    await this.prisma.$transaction(async (db) => {
      for (const movement of stockMovements) {
        const signedQty = movement.type === 'IN' ? movement.qty : -movement.qty;
        await db.product.updateMany({
          where: { id: movement.productId, tenantId },
          data: { stockQty: { increment: -signedQty } },
        });
      }
      await db.stockMovement.deleteMany({
        where: { tenantId, refType: 'SALE', refId: order.id },
      });
      if (order.chargeId) {
        await db.calendarEvent.deleteMany({
          where: { tenantId, chargeId: order.chargeId },
        });
        await db.notification.deleteMany({
          where: { tenantId, entityType: 'Charge', entityId: order.chargeId },
        });
        await db.ledgerEntry.deleteMany({
          where: {
            tenantId,
            transactionId: { in: [`charge:${order.chargeId}`, `payment:${order.chargeId}`] },
          },
        });
        await db.charge.deleteMany({
          where: { id: order.chargeId, tenantId },
        });
      }
      await db.salesOrderItem.deleteMany({
        where: { tenantId, orderId: order.id },
      });
      await db.salesOrder.delete({ where: { id: order.id } });
    });
    await this.audit.record({
      tenantId,
      actor: 'system',
      action: 'SALE_DELETED',
      entityType: 'SalesOrder',
      entityId: order.id,
      metadata: {
        previousStatus: order.status,
        chargeId: order.chargeId,
        revertedStockMovements: stockMovements.length,
      },
    });
    return { ok: true };
  }

  async confirm(tenantId: string, id: string) {
    const order = await this.prisma.salesOrder.findFirst({
      where: { id, tenantId },
    });
    if (!order) throw new NotFoundException('Pedido não encontrado.');
    if (order.status !== 'DRAFT') {
      throw new BadRequestException('Pedido não está em rascunho.');
    }
    const items = await this.prisma.salesOrderItem.findMany({
      where: { orderId: order.id },
    });

    // Baixa de estoque por item.
    for (const item of items) {
      await this.stock.move(
        tenantId,
        item.productId,
        'OUT',
        item.qty,
        `Venda #${order.number}`,
        'SALE',
        order.id,
      );
    }

    // Gera a cobrança (Conta a Receber) — reaproveita ChargesService (razão + lembrete + PIX).
    const dueDate = new Date(Date.now() + 30 * 86_400_000)
      .toISOString()
      .slice(0, 10);
    const charge = await this.charges.create(tenantId, {
      customerId: order.customerId,
      amountCents: order.totalCents,
      description: `Pedido de venda #${order.number}`,
      dueDate,
    });

    const updated = await this.prisma.salesOrder.update({
      where: { id: order.id },
      data: { status: 'CONFIRMED', chargeId: charge.id },
    });
    if (order.deliveryAt) {
      await this.prisma.calendarEvent.create({
        data: {
          tenantId,
          title: `Entrega Pedido #${order.number}`,
          type: 'TASK',
          startsAt: order.deliveryAt,
          status: 'SCHEDULED',
          customerId: order.customerId,
          notes: `Entrega do pedido confirmado #${order.number}`,
        },
      });
    }
    await this.prisma.notification.create({
      data: {
        tenantId,
        channel: 'SYSTEM',
        title: 'Pedido confirmado',
        message: `Pedido #${order.number} confirmado e cobranca criada.`,
        status: 'UNREAD',
        entityType: 'SalesOrder',
        entityId: order.id,
      },
    });
    await this.audit.record({
      tenantId,
      actor: 'system',
      action: 'SALE_CONFIRMED',
      entityType: 'SalesOrder',
      entityId: order.id,
      metadata: { chargeId: charge.id },
    });
    return updated;
  }
}
