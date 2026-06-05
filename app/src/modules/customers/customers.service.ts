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
        stage: dto.stage ?? 'LEAD',
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
    const [charges, salesOrders] = await Promise.all([
      this.prisma.charge.findMany({
        where: { tenantId, customerId: existing.id },
        select: { id: true },
      }),
      this.prisma.salesOrder.findMany({
        where: { tenantId, customerId: existing.id },
        select: { id: true, chargeId: true },
      }),
    ]);
    const chargeIds = [
      ...new Set([
        ...charges.map((charge) => charge.id),
        ...salesOrders
          .map((order) => order.chargeId)
          .filter((chargeId): chargeId is string => !!chargeId),
      ]),
    ];
    const orderIds = salesOrders.map((order) => order.id);
    const stockMovements = orderIds.length
      ? await this.prisma.stockMovement.findMany({
          where: { tenantId, refType: 'SALE', refId: { in: orderIds } },
        })
      : [];

    await this.prisma.$transaction(async (db) => {
      for (const movement of stockMovements) {
        const signedQty = movement.type === 'IN' ? movement.qty : -movement.qty;
        await db.product.updateMany({
          where: { id: movement.productId, tenantId },
          data: { stockQty: { increment: -signedQty } },
        });
      }
      if (orderIds.length) {
        await db.stockMovement.deleteMany({
          where: { tenantId, refType: 'SALE', refId: { in: orderIds } },
        });
        await db.salesOrderItem.deleteMany({
          where: { tenantId, orderId: { in: orderIds } },
        });
        await db.notification.deleteMany({
          where: {
            tenantId,
            entityType: 'SalesOrder',
            entityId: { in: orderIds },
          },
        });
        await db.salesOrder.deleteMany({
          where: { tenantId, id: { in: orderIds } },
        });
      }
      if (chargeIds.length) {
        await db.calendarEvent.deleteMany({
          where: { tenantId, chargeId: { in: chargeIds } },
        });
        await db.notification.deleteMany({
          where: {
            tenantId,
            entityType: 'Charge',
            entityId: { in: chargeIds },
          },
        });
        await db.ledgerEntry.deleteMany({
          where: {
            tenantId,
            transactionId: {
              in: chargeIds.flatMap((chargeId) => [
                `charge:${chargeId}`,
                `payment:${chargeId}`,
              ]),
            },
          },
        });
        await db.charge.deleteMany({
          where: { tenantId, id: { in: chargeIds } },
        });
      }
      await db.calendarEvent.deleteMany({
        where: { tenantId, customerId: existing.id },
      });
      await db.notification.deleteMany({
        where: { tenantId, entityType: 'Customer', entityId: existing.id },
      });
      await db.customerDocument.deleteMany({
        where: { tenantId, customerId: existing.id },
      });
      await db.customer.delete({ where: { id: existing.id } });
    });
    await this.audit.record({
      tenantId,
      actor: 'system',
      action: 'CUSTOMER_DELETED',
      entityType: 'Customer',
      entityId: id,
      metadata: {
        deletedCharges: chargeIds.length,
        deletedSalesOrders: orderIds.length,
        revertedStockMovements: stockMovements.length,
      },
    });
    return { ok: true };
  }
}
