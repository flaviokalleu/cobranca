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

  list(tenantId: string) {
    return this.prisma.purchaseOrder.findMany({
      where: { tenantId },
      orderBy: { createdAt: 'desc' },
    });
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
