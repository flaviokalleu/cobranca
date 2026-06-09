const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
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

  const plans = [
    { code: 'FREE', name: 'Gratis', priceCents: 0, maxUsers: 3, maxChargesMonth: 50 },
    { code: 'PRO', name: 'Pro', priceCents: 9900, maxUsers: 10, maxChargesMonth: 1000 },
    { code: 'BUSINESS', name: 'Empresarial', priceCents: 29900, maxUsers: 100, maxChargesMonth: 100000 },
  ];
  for (const plan of plans) {
    await prisma.plan.upsert({ where: { code: plan.code }, create: plan, update: {} });
  }

  await prisma.platformSettings.upsert({
    where: { id: 'platform' },
    create: { id: 'platform' },
    update: {},
  });

  await prisma.user.upsert({
    where: { tenantId_email: { tenantId: 'demo', email: 'admin@demo.com' } },
    create: {
      tenantId: 'demo',
      email: 'admin@demo.com',
      passwordHash: await bcrypt.hash('demo1234', 10),
      role: 'ADMIN',
    },
    update: {},
  });

  const subscription = await prisma.subscription.findFirst({ where: { tenantId: 'demo' } });
  if (!subscription) {
    await prisma.subscription.create({
      data: { tenantId: 'demo', planCode: 'FREE', status: 'ACTIVE' },
    });
  }

  await prisma.user.upsert({
    where: { tenantId_email: { tenantId: 'platform', email: 'super@plataforma.com' } },
    create: {
      tenantId: 'platform',
      email: 'super@plataforma.com',
      passwordHash: await bcrypt.hash('super1234', 10),
      role: 'SUPERADMIN',
    },
    update: {},
  });

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

  console.log('Seed concluido.');
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
