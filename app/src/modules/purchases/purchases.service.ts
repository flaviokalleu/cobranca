import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { AuditService } from '../../common/audit/audit.service';
import { StockService } from '../stock/stock.service';
import { PayablesService } from '../payables/payables.service';
import { CreatePurchaseOrderDto } from './dto/create-purchase-order.dto';
import { UpdatePurchaseOrderDto } from './dto/update-purchase-order.dto';

@Injectable()
export class PurchasesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly stock: StockService,
    private readonly payables: PayablesService,
    private readonly audit: AuditService,
  ) {}

  async create(tenantId: string, dto: CreatePurchaseOrderDto) {
    const supplier = await this.prisma.supplier.findFirst({
      where: { id: dto.supplierId, tenantId },
    });
    if (!supplier) throw new NotFoundException('Fornecedor não encontrado.');

    const number =
      (await this.prisma.purchaseOrder.count({ where: { tenantId } })) + 1;
    const order = await this.prisma.purchaseOrder.create({
      data: { tenantId, number, supplierId: supplier.id, totalCents: 0 },
    });

    let total = 0;
    const itemsData: {
      tenantId: string;
      orderId: string;
      productId: string;
      qty: number;
      unitCostCents: number;
      totalCents: number;
    }[] = [];
    for (const item of dto.items) {
      const product = await this.prisma.product.findFirst({
        where: { id: item.productId, tenantId },
      });
      if (!product) {
        throw new NotFoundException(`Produto não encontrado: ${item.productId}`);
      }
      const unitCost = item.unitCostCents ?? product.costCents;
      const lineTotal = unitCost * item.qty;
      total += lineTotal;
      itemsData.push({
        tenantId,
        orderId: order.id,
        productId: product.id,
        qty: item.qty,
        unitCostCents: unitCost,
        totalCents: lineTotal,
      });
    }

    await this.prisma.purchaseOrderItem.createMany({ data: itemsData });
    const updated = await this.prisma.purchaseOrder.update({
      where: { id: order.id },
      data: { totalCents: total },
    });
    await this.audit.record({
      tenantId,
      actor: 'system',
      action: 'PURCHASE_CREATED',
      entityType: 'PurchaseOrder',
      entityId: order.id,
      metadata: { number, totalCents: total },
    });
    return updated;
  }

  async list(tenantId: string) {
    const orders = await this.prisma.purchaseOrder.findMany({
      where: { tenantId },
      orderBy: { createdAt: 'desc' },
    });
    const items = await this.prisma.purchaseOrderItem.findMany({
      where: { tenantId, orderId: { in: orders.map((order) => order.id) } },
    });
    const itemsByOrder = new Map<string, typeof items>();
    for (const item of items) {
      itemsByOrder.set(item.orderId, [...(itemsByOrder.get(item.orderId) ?? []), item]);
    }
    return orders.map((order) => ({
      ...order,
      items: itemsByOrder.get(order.id) ?? [],
    }));
  }

  async update(tenantId: string, id: string, dto: UpdatePurchaseOrderDto) {
    const order = await this.prisma.purchaseOrder.findFirst({
      where: { id, tenantId },
    });
    if (!order) throw new NotFoundException('Pedido de compra nao encontrado.');
    if (order.status !== 'DRAFT') {
      throw new BadRequestException(
        'Somente pedidos de compra em rascunho podem ser editados.',
      );
    }
    if (dto.supplierId) {
      const supplier = await this.prisma.supplier.findFirst({
        where: { id: dto.supplierId, tenantId },
      });
      if (!supplier) throw new NotFoundException('Fornecedor nao encontrado.');
    }

    let total = order.totalCents;
    const itemsData: {
      tenantId: string;
      orderId: string;
      productId: string;
      qty: number;
      unitCostCents: number;
      totalCents: number;
    }[] = [];

    if (dto.items) {
      total = 0;
      for (const item of dto.items) {
        const product = await this.prisma.product.findFirst({
          where: { id: item.productId, tenantId, active: true },
        });
        if (!product) throw new NotFoundException(`Produto nao encontrado: ${item.productId}`);
        const unitCost = item.unitCostCents ?? product.costCents;
        const lineTotal = unitCost * item.qty;
        total += lineTotal;
        itemsData.push({
          tenantId,
          orderId: order.id,
          productId: product.id,
          qty: item.qty,
          unitCostCents: unitCost,
          totalCents: lineTotal,
        });
      }
    }

    const updated = await this.prisma.$transaction(async (db) => {
      if (dto.items) {
        await db.purchaseOrderItem.deleteMany({ where: { orderId: order.id } });
        await db.purchaseOrderItem.createMany({ data: itemsData });
      }
      return db.purchaseOrder.update({
        where: { id: order.id },
        data: {
          supplierId: dto.supplierId,
          totalCents: total,
        },
      });
    });

    await this.audit.record({
      tenantId,
      actor: 'system',
      action: 'PURCHASE_UPDATED',
      entityType: 'PurchaseOrder',
      entityId: order.id,
      metadata: { totalCents: updated.totalCents },
    });
    return updated;
  }

  async remove(tenantId: string, id: string) {
    const order = await this.prisma.purchaseOrder.findFirst({
      where: { id, tenantId },
    });
    if (!order) throw new NotFoundException('Pedido de compra nao encontrado.');
    if (order.status !== 'DRAFT') {
      throw new BadRequestException(
        'Somente pedidos de compra em rascunho podem ser excluidos.',
      );
    }
    await this.prisma.$transaction([
      this.prisma.purchaseOrderItem.deleteMany({ where: { orderId: order.id } }),
      this.prisma.purchaseOrder.delete({ where: { id: order.id } }),
    ]);
    await this.audit.record({
      tenantId,
      actor: 'system',
      action: 'PURCHASE_DELETED',
      entityType: 'PurchaseOrder',
      entityId: order.id,
    });
    return { ok: true };
  }

  async receive(tenantId: string, id: string) {
    const order = await this.prisma.purchaseOrder.findFirst({
      where: { id, tenantId },
    });
    if (!order) throw new NotFoundException('Pedido de compra não encontrado.');
    if (order.status !== 'DRAFT') {
      throw new BadRequestException('Pedido não está em rascunho.');
    }
    const items = await this.prisma.purchaseOrderItem.findMany({
      where: { orderId: order.id },
    });

    // Entrada de estoque por item.
    for (const item of items) {
      await this.stock.move(
        tenantId,
        item.productId,
        'IN',
        item.qty,
        `Compra #${order.number}`,
        'PURCHASE',
        order.id,
      );
    }

    // Gera a conta a pagar (reaproveita PayablesService → razão).
    const dueDate = new Date(Date.now() + 30 * 86_400_000)
      .toISOString()
      .slice(0, 10);
    const payable = await this.payables.create(tenantId, {
      description: `Compra #${order.number}`,
      amountCents: order.totalCents,
      dueDate,
      supplierId: order.supplierId,
      category: 'Compra',
    });

    const updated = await this.prisma.purchaseOrder.update({
      where: { id: order.id },
      data: { status: 'RECEIVED', payableId: payable.id },
    });
    await this.audit.record({
      tenantId,
      actor: 'system',
      action: 'PURCHASE_RECEIVED',
      entityType: 'PurchaseOrder',
      entityId: order.id,
      metadata: { payableId: payable.id },
    });
    return updated;
  }
}
