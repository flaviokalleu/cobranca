import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { AuditService } from '../../common/audit/audit.service';
import { AdjustStockDto } from './dto/adjust-stock.dto';
import { UpdateStockMovementDto } from './dto/update-stock-movement.dto';
import {
  paginated,
  paginationArgs,
  PaginationDto,
} from '../../common/dto/pagination.dto';

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
    if (type === 'OUT' && product.stockQty < qty) {
      throw new BadRequestException(`Estoque insuficiente para ${product.name}. Disponivel: ${product.stockQty}.`);
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

  async movements(tenantId: string, query: PaginationDto) {
    const { skip, take } = paginationArgs(query);
    const search = query.search?.trim();
    const where = {
      tenantId,
      ...(search
        ? {
            OR: [
              { reason: { contains: search, mode: 'insensitive' as const } },
              { refType: { contains: search, mode: 'insensitive' as const } },
            ],
          }
        : {}),
    };
    const [data, total] = await this.prisma.$transaction([
      this.prisma.stockMovement.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take,
      }),
      this.prisma.stockMovement.count({ where }),
    ]);
    return paginated(data, total, query);
  }

  async updateMovement(tenantId: string, id: string, dto: UpdateStockMovementDto) {
    const movement = await this.prisma.stockMovement.findFirst({
      where: { id, tenantId },
    });
    if (!movement) throw new NotFoundException('Movimentacao nao encontrada.');
    if (movement.refType !== 'ADJUST') {
      throw new BadRequestException(
        'Somente ajustes manuais podem ser editados. Edite o documento de origem.',
      );
    }

    const oldSignedQty = movement.type === 'IN' ? movement.qty : -movement.qty;
    const nextSignedQty = dto.qty ?? oldSignedQty;
    if (nextSignedQty === 0) {
      throw new BadRequestException('Informe uma quantidade diferente de zero.');
    }
    const delta = nextSignedQty - oldSignedQty;
    const type: StockMoveType = nextSignedQty > 0 ? 'IN' : 'OUT';

    await this.prisma.$transaction([
      this.prisma.stockMovement.update({
        where: { id: movement.id },
        data: {
          type,
          qty: Math.abs(nextSignedQty),
          reason: dto.reason,
        },
      }),
      this.prisma.product.update({
        where: { id: movement.productId },
        data: { stockQty: { increment: delta } },
      }),
    ]);

    await this.audit.record({
      tenantId,
      actor: 'system',
      action: 'STOCK_MOVEMENT_UPDATED',
      entityType: 'StockMovement',
      entityId: movement.id,
      metadata: { delta },
    });

    return this.prisma.stockMovement.findFirst({
      where: { id: movement.id, tenantId },
    });
  }

  async removeMovement(tenantId: string, id: string) {
    const movement = await this.prisma.stockMovement.findFirst({
      where: { id, tenantId },
    });
    if (!movement) throw new NotFoundException('Movimentacao nao encontrada.');
    const signedQty = movement.type === 'IN' ? movement.qty : -movement.qty;
    await this.prisma.$transaction([
      this.prisma.stockMovement.delete({ where: { id: movement.id } }),
      this.prisma.product.update({
        where: { id: movement.productId },
        data: { stockQty: { increment: -signedQty } },
      }),
    ]);
    await this.audit.record({
      tenantId,
      actor: 'system',
      action: 'STOCK_MOVEMENT_DELETED',
      entityType: 'StockMovement',
      entityId: movement.id,
      metadata: {
        revertedQty: signedQty,
        refType: movement.refType,
        refId: movement.refId,
      },
    });
    return { ok: true };
  }
}
