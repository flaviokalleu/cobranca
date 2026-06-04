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
      data: { tenantId, number, customerId: customer.id, totalCents: 0 },
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

  list(tenantId: string) {
    return this.prisma.salesOrder.findMany({
      where: { tenantId },
      orderBy: { createdAt: 'desc' },
    });
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
