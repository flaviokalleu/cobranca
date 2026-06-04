import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main(): Promise<void> {
  // Empresas (tenants)
  await prisma.tenant.upsert({
    where: { id: 'demo' },
    create: { id: 'demo', name: 'Empresa Demo', slug: 'demo' },
    update: {},
  });
  await prisma.tenant.upsert({
    where: { id: 'platform' },
    create: { id: 'platform', name: 'Plataforma', slug: 'platform' },
    update: {},
  });

  // Planos padrao
  const plans = [
    { code: 'FREE', name: 'Grátis', priceCents: 0, maxUsers: 3, maxChargesMonth: 50 },
    { code: 'PRO', name: 'Pro', priceCents: 9900, maxUsers: 10, maxChargesMonth: 1000 },
    { code: 'BUSINESS', name: 'Empresarial', priceCents: 29900, maxUsers: 100, maxChargesMonth: 100000 },
  ];
  for (const p of plans) {
    await prisma.plan.upsert({ where: { code: p.code }, create: p, update: {} });
  }

  // Config da plataforma (linha unica)
  await prisma.platformSettings.upsert({
    where: { id: 'platform' },
    create: { id: 'platform' },
    update: {},
  });

  // Admin da empresa demo + assinatura FREE
  const adminEmail = 'admin@demo.com';
  await prisma.user.upsert({
    where: { tenantId_email: { tenantId: 'demo', email: adminEmail } },
    create: {
      tenantId: 'demo',
      email: adminEmail,
      passwordHash: await bcrypt.hash('demo1234', 10),
      role: 'ADMIN',
    },
    update: {},
  });
  const sub = await prisma.subscription.findFirst({ where: { tenantId: 'demo' } });
  if (!sub) {
    await prisma.subscription.create({
      data: { tenantId: 'demo', planCode: 'FREE', status: 'ACTIVE' },
    });
  }

  // Superadmin da plataforma
  const superEmail = 'super@plataforma.com';
  await prisma.user.upsert({
    where: { tenantId_email: { tenantId: 'platform', email: superEmail } },
    create: {
      tenantId: 'platform',
      email: superEmail,
      passwordHash: await bcrypt.hash('super1234', 10),
      role: 'SUPERADMIN',
    },
    update: {},
  });

  // Cliente exemplo
  const customer = await prisma.customer.findFirst({ where: { tenantId: 'demo' } });
  if (!customer) {
    await prisma.customer.create({
      data: {
        tenantId: 'demo',
        name: 'Maria Souza',
        document: '12345678901',
        phone: '+5511999998888',
        whatsapp: '+5511999998888',
        email: 'maria@exemplo.com',
        city: 'Sao Paulo',
        profession: 'Analista',
      },
    });
  }

  console.log('Seed concluído.');
  const documentRequirements = [
    'RG',
    'CPF',
    'Comprovante de renda',
    'Comprovante de residencia',
    'Carteira de trabalho',
    'Extrato FGTS',
    'Certidao de nascimento',
    'Certidao de casamento',
  ];
  for (const name of documentRequirements) {
    const exists = await prisma.documentRequirement.findFirst({
      where: { tenantId: 'demo', name },
    });
    if (!exists) {
      await prisma.documentRequirement.create({
        data: { tenantId: 'demo', name, category: 'Minha Casa Minha Vida' },
      });
    }
  }

  console.log('  Empresa: tenant=demo / admin@demo.com / demo1234');
  console.log('  Superadmin: super@plataforma.com / super1234 (empresa: platform)');
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => {
    void prisma.$disconnect();
  });
