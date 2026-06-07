import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { CreateAccountPlanDto, UpdateAccountPlanDto } from './dto/account-plan.dto';

const DEFAULT_ACCOUNTS = [
  { code: '1.1', name: 'Caixa e bancos', type: 'ASSET' },
  { code: '1.2', name: 'Contas a receber', type: 'ASSET' },
  { code: '2.1', name: 'Contas a pagar', type: 'LIABILITY' },
  { code: '3.1', name: 'Receita de servicos', type: 'REVENUE' },
  { code: '3.2', name: 'Receita de juros', type: 'REVENUE' },
  { code: '4.1', name: 'Despesas operacionais', type: 'EXPENSE' },
  { code: '4.2', name: 'Impostos e taxas', type: 'EXPENSE' },
];

@Injectable()
export class AccountPlanService {
  constructor(private readonly prisma: PrismaService) {}

  list(tenantId: string) {
    return this.prisma.accountPlan.findMany({ where: { tenantId }, orderBy: { code: 'asc' } });
  }

  create(tenantId: string, dto: CreateAccountPlanDto) {
    return this.prisma.accountPlan.create({ data: { tenantId, ...dto } });
  }

  updateByCode(tenantId: string, code: string, dto: UpdateAccountPlanDto) {
    return this.prisma.accountPlan.update({
      where: { tenantId_code: { tenantId, code } },
      data: dto,
    });
  }

  removeByCode(tenantId: string, code: string) {
    return this.prisma.accountPlan.update({
      where: { tenantId_code: { tenantId, code } },
      data: { active: false },
    });
  }

  async seedDefault(tenantId: string) {
    for (const account of DEFAULT_ACCOUNTS) {
      await this.prisma.accountPlan.upsert({
        where: { tenantId_code: { tenantId, code: account.code } },
        create: { tenantId, ...account },
        update: { name: account.name, type: account.type, active: true },
      });
    }
    return this.list(tenantId);
  }
}
