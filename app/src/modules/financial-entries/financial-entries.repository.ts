import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import {
  paginated,
  paginationArgs,
  PaginationDto,
} from '../../common/dto/pagination.dto';

@Injectable()
export class FinancialEntriesRepository {
  constructor(private readonly prisma: PrismaService) {}

  async listByTenant(tenantId: string, query: PaginationDto & { status?: string }) {
    const { skip, take } = paginationArgs(query);
    const search = query.search?.trim();
    const where = {
      tenantId,
      status: query.status ?? 'saved',
      ...(search
        ? {
            OR: [
              { descricao: { contains: search, mode: 'insensitive' as const } },
              { pagadorNome: { contains: search, mode: 'insensitive' as const } },
              { recebedorNome: { contains: search, mode: 'insensitive' as const } },
            ],
          }
        : {}),
    };
    const [data, total] = await this.prisma.$transaction([
      this.prisma.financialEntry.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take,
        include: { lead: { select: { id: true, name: true, whatsapp: true } } },
      }),
      this.prisma.financialEntry.count({ where }),
    ]);
    return paginated(data, total, query);
  }
}
