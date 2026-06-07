import {
  Activity,
  Banknote,
  Building2,
  CalendarDays,
  ClipboardList,
  CreditCard,
  FileCheck,
  FileText,
  FolderTree,
  KeyRound,
  Landmark,
  LayoutDashboard,
  LineChart,
  ListChecks,
  Package,
  PackageCheck,
  PiggyBank,
  QrCode,
  ReceiptText,
  Settings,
  ShieldCheck,
  ShoppingCart,
  Split,
  Sparkles,
  Target,
  Truck,
  UserCog,
  Users,
  Wallet,
  type LucideIcon,
} from 'lucide-react';

export interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  adminOnly?: boolean;
}

export interface NavSection {
  title?: string;
  items: NavItem[];
}

export const navSections: NavSection[] = [
  { items: [{ href: '/dashboard', label: 'Painel', icon: LayoutDashboard }] },
  {
    title: 'Financeiro',
    items: [
      { href: '/dashboard/cobrancas', label: 'Receita', icon: Wallet },
      { href: '/dashboard/cobrancas/templates', label: 'Templates', icon: ReceiptText },
      { href: '/dashboard/financeiro/pagar', label: 'Despesas', icon: Banknote },
      { href: '/dashboard/financeiro/fluxo', label: 'Fluxo de caixa', icon: LineChart },
      { href: '/dashboard/financeiro/dre', label: 'DRE', icon: FileText, adminOnly: true },
      { href: '/dashboard/financeiro/plano-contas', label: 'Plano de contas', icon: FolderTree, adminOnly: true },
      { href: '/dashboard/financeiro/recibos', label: 'Recibos', icon: ReceiptText },
      { href: '/dashboard/financeiro/reconciliacao', label: 'Reconciliacao', icon: Split },
      { href: '/dashboard/financeiro/impostos', label: 'Impostos', icon: ShieldCheck },
      { href: '/dashboard/financeiro/pessoal', label: 'Financas pessoais', icon: PiggyBank },
      { href: '/dashboard/financeiro/open-finance', label: 'Open Finance', icon: Building2 },
      { href: '/dashboard/emprestimos', label: 'Emprestimos', icon: Landmark },
      { href: '/dashboard/ai', label: 'IA Financeira', icon: Sparkles },
    ],
  },
  {
    title: 'CRM',
    items: [{ href: '/dashboard/crm', label: 'Funil', icon: Target }],
  },
  {
    title: 'Tarefas',
    items: [{ href: '/dashboard/tarefas', label: 'Checklist', icon: ListChecks }],
  },
  {
    title: 'Operacao',
    items: [
      { href: '/dashboard/documentos', label: 'Documentos', icon: FileCheck },
      { href: '/dashboard/calendario', label: 'Calendario', icon: CalendarDays },
    ],
  },
  {
    title: 'Cadastros',
    items: [{ href: '/dashboard/clientes', label: 'Clientes', icon: Users }],
  },
  {
    title: 'Comercial',
    items: [
      { href: '/dashboard/fornecedores', label: 'Fornecedores', icon: Truck },
      { href: '/dashboard/produtos', label: 'Produtos', icon: Package },
      { href: '/dashboard/estoque', label: 'Estoque', icon: PackageCheck },
      { href: '/dashboard/vendas', label: 'Pedidos de Venda', icon: ShoppingCart },
      { href: '/dashboard/compras', label: 'Pedidos de Compra', icon: ClipboardList },
    ],
  },
  {
    title: 'Sistema',
    items: [
      { href: '/dashboard/usuarios', label: 'Usuarios', icon: UserCog, adminOnly: true },
      { href: '/dashboard/admin/whatsapp', label: 'WhatsApp do Robo', icon: QrCode, adminOnly: true },
      {
        href: '/dashboard/companies/activation-codes',
        label: 'Codigos de ativacao',
        icon: KeyRound,
        adminOnly: true,
      },
      { href: '/dashboard/configuracoes', label: 'Configuracoes', icon: Settings, adminOnly: true },
      { href: '/dashboard/assinatura', label: 'Assinatura', icon: CreditCard, adminOnly: true },
      { href: '/dashboard/atividade', label: 'Atividade', icon: Activity, adminOnly: true },
    ],
  },
];
