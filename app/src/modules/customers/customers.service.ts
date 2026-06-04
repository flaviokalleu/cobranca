import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { AuditService } from '../../common/audit/audit.service';
import { CreateCustomerDto } from './dto/create-customer.dto';
import { UpdateCustomerDto } from './dto/update-customer.dto';

@Injectable()
export class CustomersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async create(tenantId: string, dto: CreateCustomerDto) {
    const customer = await this.prisma.customer.create({
      data: {
        tenantId,
        name: dto.name,
        document: dto.document ?? null,
        phone: dto.phone,
        whatsapp: dto.whatsapp ?? null,
        email: dto.email ?? null,
        address: dto.address ?? null,
        city: dto.city ?? null,
        profession: dto.profession ?? null,
        incomeCents: dto.incomeCents ?? null,
      },
    });

    await this.audit.record({
      tenantId,
      actor: 'system',
      action: 'CUSTOMER_CREATED',
      entityType: 'Customer',
      entityId: customer.id,
    });

    return customer;
  }

  /// Sempre filtra por tenantId — nunca vaza dados entre empresas.
  list(tenantId: string) {
    return this.prisma.customer.findMany({
      where: { tenantId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async update(tenantId: string, id: string, dto: UpdateCustomerDto) {
    const existing = await this.prisma.customer.findFirst({
      where: { id, tenantId },
    });
    if (!existing) throw new NotFoundException('Cliente não encontrado.');
    const customer = await this.prisma.customer.update({
      where: { id: existing.id },
      data: { ...dto }, // campos undefined sao ignorados pelo Prisma
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

  async remove(tenantId: string, id: string) {
    const existing = await this.prisma.customer.findFirst({
      where: { id, tenantId },
    });
    if (!existing) throw new NotFoundException('Cliente não encontrado.');
    await this.prisma.customer.delete({ where: { id: existing.id } });
    await this.audit.record({
      tenantId,
      actor: 'system',
      action: 'CUSTOMER_DELETED',
      entityType: 'Customer',
      entityId: id,
    });
    return { ok: true };
  }
}
