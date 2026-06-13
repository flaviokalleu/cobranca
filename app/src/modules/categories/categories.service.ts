import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { CreateCategoryDto, UpdateCategoryDto } from './dto/category.dto';

const DEFAULT_CATEGORIES = [
  // INCOME
  { name: 'Salário', type: 'INCOME', color: '#10b981' },
  { name: 'Freelance / Serviços', type: 'INCOME', color: '#06b6d4' },
  { name: 'Aluguel recebido', type: 'INCOME', color: '#8b5cf6' },
  { name: 'Vendas', type: 'INCOME', color: '#f59e0b' },
  { name: 'Investimentos', type: 'INCOME', color: '#6366f1' },
  { name: 'Outros (entrada)', type: 'INCOME', color: '#9ca3af' },
  // EXPENSE
  { name: 'Moradia', type: 'EXPENSE', color: '#ef4444' },
  { name: 'Alimentação', type: 'EXPENSE', color: '#f97316' },
  { name: 'Transporte', type: 'EXPENSE', color: '#eab308' },
  { name: 'Saúde', type: 'EXPENSE', color: '#ec4899' },
  { name: 'Educação', type: 'EXPENSE', color: '#3b82f6' },
  { name: 'Lazer', type: 'EXPENSE', color: '#a855f7' },
  { name: 'Serviços (água, luz, internet)', type: 'EXPENSE', color: '#14b8a6' },
  { name: 'Impostos / Taxas', type: 'EXPENSE', color: '#64748b' },
  { name: 'Outros (saída)', type: 'EXPENSE', color: '#9ca3af' },
];

@Injectable()
export class CategoriesService {
  constructor(private readonly prisma: PrismaService) {}

  list(tenantId: string, type?: string) {
    return this.prisma.financialCategory.findMany({
      where: { tenantId, active: true, ...(type ? { type } : {}) },
      orderBy: [{ isDefault: 'desc' }, { name: 'asc' }],
    });
  }

  create(tenantId: string, dto: CreateCategoryDto) {
    return this.prisma.financialCategory.create({
      data: { tenantId, ...dto, color: dto.color ?? '#6366f1' },
    });
  }

  update(tenantId: string, id: string, dto: UpdateCategoryDto) {
    return this.prisma.financialCategory.update({
      where: { id, tenantId },
      data: dto,
    });
  }

  remove(tenantId: string, id: string) {
    return this.prisma.financialCategory.update({
      where: { id, tenantId },
      data: { active: false },
    });
  }

  async seedDefault(tenantId: string) {
    for (const cat of DEFAULT_CATEGORIES) {
      await this.prisma.financialCategory.upsert({
        where: { tenantId_name_type: { tenantId, name: cat.name, type: cat.type } },
        create: { tenantId, ...cat, isDefault: true },
        update: { color: cat.color, active: true, isDefault: true },
      });
    }
    return this.list(tenantId);
  }
}
