import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { AuditService } from '../../common/audit/audit.service';
import { CreateProductDto } from './dto/create-product.dto';

@Injectable()
export class ProductsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async create(tenantId: string, dto: CreateProductDto) {
    const product = await this.prisma.product.create({
      data: {
        tenantId,
        sku: dto.sku,
        name: dto.name,
        description: dto.description ?? null,
        priceCents: dto.priceCents,
        costCents: dto.costCents,
        unit: dto.unit ?? 'UN',
      },
    });
    await this.audit.record({
      tenantId,
      actor: 'system',
      action: 'PRODUCT_CREATED',
      entityType: 'Product',
      entityId: product.id,
    });
    return product;
  }

  list(tenantId: string) {
    return this.prisma.product.findMany({
      where: { tenantId },
      orderBy: { createdAt: 'desc' },
    });
  }
}
