import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { AuditService } from '../../common/audit/audit.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';

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
      where: { tenantId, active: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async update(tenantId: string, id: string, dto: UpdateProductDto) {
    const existing = await this.prisma.product.findFirst({ where: { id, tenantId } });
    if (!existing) throw new NotFoundException('Produto nao encontrado.');
    const product = await this.prisma.product.update({
      where: { id: existing.id },
      data: {
        sku: dto.sku,
        name: dto.name,
        description: dto.description,
        priceCents: dto.priceCents,
        costCents: dto.costCents,
        unit: dto.unit,
        active: dto.active,
      },
    });
    await this.audit.record({
      tenantId,
      actor: 'system',
      action: 'PRODUCT_UPDATED',
      entityType: 'Product',
      entityId: product.id,
    });
    return product;
  }

  async remove(tenantId: string, id: string) {
    const existing = await this.prisma.product.findFirst({ where: { id, tenantId } });
    if (!existing) throw new NotFoundException('Produto nao encontrado.');
    await this.prisma.product.update({
      where: { id: existing.id },
      data: { active: false },
    });
    await this.audit.record({
      tenantId,
      actor: 'system',
      action: 'PRODUCT_DELETED',
      entityType: 'Product',
      entityId: existing.id,
    });
    return { ok: true };
  }
}
