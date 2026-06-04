import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { AuditService } from '../../common/audit/audit.service';
import { AdjustStockDto } from './dto/adjust-stock.dto';

export type StockMoveType = 'IN' | 'OUT';

/// Estoque. `move` e reutilizado por vendas (OUT) e compras (IN).
@Injectable()
export class StockService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async move(
    tenantId: string,
    productId: string,
    type: StockMoveType,
    qtyAbs: number,
    reason: string,
    refType?: string,
    refId?: string,
  ): Promise<void> {
    const product = await this.prisma.product.findFirst({
      where: { id: productId, tenantId },
    });
    if (!product) {
      throw new NotFoundException('Produto nao encontrado neste tenant.');
    }
    const qty = Math.abs(qtyAbs);
    if (qty <= 0) {
      throw new BadRequestException('Quantidade deve ser positiva.');
    }
    const delta = type === 'OUT' ? -qty : qty;
    await this.prisma.$transaction([
      this.prisma.stockMovement.create({
        data: {
          tenantId,
          productId,
          type,
          qty,
          reason,
          refType: refType ?? null,
          refId: refId ?? null,
        },
      }),
      this.prisma.product.update({
        where: { id: product.id },
        data: { stockQty: { increment: delta } },
      }),
    ]);
  }

  async adjust(tenantId: string, dto: AdjustStockDto) {
    if (dto.qty === 0) {
      throw new BadRequestException('Informe uma quantidade diferente de zero.');
    }
    const type: StockMoveType = dto.qty > 0 ? 'IN' : 'OUT';
    await this.move(
      tenantId,
      dto.productId,
      type,
      Math.abs(dto.qty),
      dto.reason ?? 'Ajuste manual',
      'ADJUST',
    );
    await this.audit.record({
      tenantId,
      actor: 'system',
      action: 'STOCK_ADJUSTED',
      entityType: 'Product',
      entityId: dto.productId,
      metadata: { qty: dto.qty },
    });
    return this.prisma.product.findFirst({
      where: { id: dto.productId, tenantId },
    });
  }

  movements(tenantId: string) {
    return this.prisma.stockMovement.findMany({
      where: { tenantId },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
  }
}
