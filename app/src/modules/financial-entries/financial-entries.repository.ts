import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';

@Injectable()
export class FinancialEntriesRepository {
  constructor(private readonly prisma: PrismaService) {}

  listByTenant(tenantId: string) {
    return this.prisma.financialEntry.findMany({
      where: { tenantId, status: 'saved' },
      orderBy: { createdAt: 'desc' },
      take: 200,
      include: { lead: { select: { id: true, name: true, whatsapp: true } } },
    });
  }
}
