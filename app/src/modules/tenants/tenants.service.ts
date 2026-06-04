import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';

@Injectable()
export class TenantsService {
  constructor(private readonly prisma: PrismaService) {}

  private slugify(input: string): string {
    return (
      input
        .toLowerCase()
        .normalize('NFD')
        .replace(/[̀-ͯ]/g, '')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')
        .slice(0, 40) || 'empresa'
    );
  }

  /// Cria empresa com slug unico (o slug vira o tenantId usado em todo o sistema).
  async createTenant(name: string) {
    const base = this.slugify(name);
    let slug = base;
    let n = 1;
    while (await this.prisma.tenant.findUnique({ where: { slug } })) {
      slug = `${base}-${++n}`;
    }
    return this.prisma.tenant.create({ data: { id: slug, name, slug } });
  }

  findById(id: string) {
    return this.prisma.tenant.findUnique({ where: { id } });
  }

  list() {
    return this.prisma.tenant.findMany({ orderBy: { createdAt: 'desc' } });
  }

  setStatus(id: string, status: 'ACTIVE' | 'SUSPENDED') {
    return this.prisma.tenant.update({ where: { id }, data: { status } });
  }
}
