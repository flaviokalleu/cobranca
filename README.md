# WEBBA ERP — Sistema de Gestão Empresarial

Sistema SaaS multi-tenant completo para gestão financeira, CRM, estoque e operações empresariais com integração WhatsApp.

---

## Stack

**Backend**
- NestJS · PostgreSQL · Prisma · Redis · BullMQ
- JWT Auth · RBAC/ABAC · Multi-tenant · Audit logging
- WhatsApp Bot (Baileys) · OCR de comprovantes · OFX Parser

**Frontend**
- Next.js 14 · TypeScript · Tailwind CSS · Redux Toolkit
- Recharts · DnD Kit · Sonner · next-themes
- PWA-ready · Mobile-first · Sidebar colapsável

**IA / Integração**
- DeepSeek AI para consultas financeiras
- Extração automática de transações via WhatsApp
- Open Finance (Pluggy) — 155+ conectores

---

## Módulos

| Área | Funcionalidades |
|------|----------------|
| **Financeiro** | Receitas, Despesas, Fluxo de Caixa, DRE, Plano de Contas, Recibos, Reconciliação, Impostos |
| **WhatsApp** | Bot de cobrança, extrator de receitas/gastos, comprovantes via OCR |
| **CRM** | Funil de vendas Kanban, leads, clientes, histórico |
| **Estoque** | Produtos, Categorias, Controle de estoque crítico |
| **Comercial** | Pedidos de venda, Pedidos de compra, Fornecedores |
| **Financeiro Pessoal** | Contas, Cartões, Limites de gastos, Metas de investimento |
| **Open Finance** | Integração Pluggy, importação OFX |
| **IA Financeira** | Consultas em linguagem natural, análise de transações |
| **Operação** | Tarefas, Calendário, Documentos com OCR, Notificações em tempo real |
| **Admin** | Usuários, Permissões, Configurações, WhatsApp QR, Assinatura, Auditoria |

---

## Arquitetura

```
cobranca/
├── app/              # Backend NestJS
│   ├── src/
│   │   ├── auth/             # Autenticação JWT + 2FA
│   │   ├── common/           # Settings, Audit, Health
│   │   └── modules/          # Todos os módulos de negócio
│   └── prisma/               # Schema PostgreSQL
│
└── web/              # Frontend Next.js
    ├── app/dashboard/        # Páginas da aplicação
    ├── components/           # Sidebar, MobileNav, PageHeader, etc.
    ├── store/                # Redux slices
    └── hooks/                # Custom hooks
```

**Padrões aplicados:** Clean Architecture · DDD · SOLID · Event-Driven · CQRS · Modular Monolith

---

## Interface

- **Desktop**: Sidebar colapsável (ícones ↔ completa), toggle persistido
- **Mobile**: Bottom tabs (Painel · Receita · Clientes · CRM) + Drawer lateral com navegação completa
- **Tema**: Claro / Escuro com next-themes
- **Busca global**: Ctrl+K — clientes, cobranças, tarefas, produtos

---

## Rodando localmente

### Pré-requisitos
- Node.js 18+
- PostgreSQL
- Redis

### Backend

```bash
cd app
cp .env.production.example .env
# Edite .env com suas credenciais
npm install
npx prisma migrate dev
npm run start:dev
```

### Frontend

```bash
cd web
npm install
npm run dev
# Acessa: http://localhost:3001
```

### Iniciar tudo (Windows)

```bash
iniciar.bat
```

---

## Acesso demo

```
URL:   http://localhost:3001
Email: admin@demo.com
Senha: demo1234
```

---

## Variáveis de ambiente principais

```env
DATABASE_URL=postgresql://...
JWT_SECRET=...
REDIS_URL=redis://localhost:6379
PLUGGY_CLIENT_ID=...
PLUGGY_CLIENT_SECRET=...
DEEPSEEK_API_KEY=...
```

---

## Licença

Projeto proprietário — todos os direitos reservados.
