import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';

@Injectable()
export class SearchService {
  constructor(private readonly prisma: PrismaService) {}

  async search(tenantId: string, q = '') {
    const query = q.trim();
    if (query.length < 2) {
      return { customers: [], charges: [], tasks: [], products: [], suppliers: [] };
    }
    const contains = { contains: query, mode: 'insensitive' as const };
    const [customers, charges, tasks, products, suppliers] = await Promise.all([
      this.prisma.customer.findMany({
        where: { tenantId, OR: [{ name: contains }, { document: contains }, { phone: contains }] },
        select: { id: true, name: true, phone: true, document: true },
        take: 5,
      }),
      this.prisma.charge.findMany({
        where: { tenantId, OR: [{ description: contains }, { customer: { name: contains } }] },
        select: { id: true, description: true, amountCents: true, status: true, customer: { select: { name: true } } },
        take: 5,
      }),
      this.prisma.task.findMany({
        where: { tenantId, OR: [{ title: contains }, { notes: contains }] },
        select: { id: true, title: true, done: true, dueDate: true },
        take: 5,
      }),
      this.prisma.product.findMany({
        where: { tenantId, OR: [{ name: contains }, { sku: contains }] },
        select: { id: true, name: true, sku: true, stockQty: true },
        take: 5,
      }),
      this.prisma.supplier.findMany({
        where: { tenantId, OR: [{ name: contains }, { document: contains }, { phone: contains }] },
        select: { id: true, name: true, phone: true, document: true },
        take: 5,
      }),
    ]);
    return { customers, charges, tasks, products, suppliers };
  }
}
