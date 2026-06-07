import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { AuditService } from '../../common/audit/audit.service';
import { CreateSupplierDto } from './dto/create-supplier.dto';
import { UpdateSupplierDto } from './dto/update-supplier.dto';
import {
  paginated,
  paginationArgs,
  PaginationDto,
} from '../../common/dto/pagination.dto';

@Injectable()
export class SuppliersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async create(tenantId: string, dto: CreateSupplierDto) {
    const supplier = await this.prisma.supplier.create({
      data: {
        tenantId,
        name: dto.name,
        document: dto.document ?? null,
        phone: dto.phone ?? null,
        email: dto.email ?? null,
      },
    });
    await this.audit.record({
      tenantId,
      actor: 'system',
      action: 'SUPPLIER_CREATED',
      entityType: 'Supplier',
      entityId: supplier.id,
    });
    return supplier;
  }

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
      this.prisma.supplier.findMany({ where, orderBy: { createdAt: 'desc' }, skip, take }),
      this.prisma.supplier.count({ where }),
    ]);
    return paginated(data, total, query);
  }

  async update(tenantId: string, id: string, dto: UpdateSupplierDto) {
    const existing = await this.prisma.supplier.findFirst({ where: { id, tenantId } });
    if (!existing) throw new NotFoundException('Fornecedor nao encontrado.');
    const supplier = await this.prisma.supplier.update({
      where: { id: existing.id },
      data: {
        name: dto.name,
        document: dto.document,
        phone: dto.phone,
        email: dto.email,
      },
    });
    await this.audit.record({
      tenantId,
      actor: 'system',
      action: 'SUPPLIER_UPDATED',
      entityType: 'Supplier',
      entityId: supplier.id,
    });
    return supplier;
  }

  async remove(tenantId: string, id: string) {
    const existing = await this.prisma.supplier.findFirst({ where: { id, tenantId } });
    if (!existing) throw new NotFoundException('Fornecedor nao encontrado.');
    const [purchaseOrders, payables] = await Promise.all([
      this.prisma.purchaseOrder.count({ where: { tenantId, supplierId: existing.id } }),
      this.prisma.payable.count({ where: { tenantId, supplierId: existing.id } }),
    ]);
    await this.prisma.$transaction([
      this.prisma.payable.updateMany({
        where: { tenantId, supplierId: existing.id },
        data: { supplierId: null },
      }),
      this.prisma.supplier.delete({ where: { id: existing.id } }),
    ]);
    await this.audit.record({
      tenantId,
      actor: 'system',
      action: 'SUPPLIER_DELETED',
      entityType: 'Supplier',
      entityId: existing.id,
      metadata: { linkedPurchaseOrders: purchaseOrders, unlinkedPayables: payables },
    });
    return { ok: true };
  }
}
