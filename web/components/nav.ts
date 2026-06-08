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
    title: 'Dinheiro',
    items: [
      { href: '/dashboard/cobrancas', label: 'Receber', icon: Wallet },
      { href: '/dashboard/financeiro/pagar', label: 'Pagar', icon: Banknote },
      { href: '/dashboard/financeiro/fluxo', label: 'Entradas e saidas', icon: LineChart },
      { href: '/dashboard/cobrancas/templates', label: 'Modelos de cobranca', icon: ReceiptText },
      { href: '/dashboard/financeiro/recibos', label: 'Recibos para revisar', icon: ReceiptText },
      { href: '/dashboard/financeiro/reconciliacao', label: 'Conferir banco', icon: Split },
      { href: '/dashboard/financeiro/dre', label: 'Lucro e prejuizo', icon: FileText, adminOnly: true },
      { href: '/dashboard/financeiro/plano-contas', label: 'Categorias financeiras', icon: FolderTree, adminOnly: true },
      { href: '/dashboard/financeiro/impostos', label: 'Impostos', icon: ShieldCheck },
      { href: '/dashboard/financeiro/pessoal', label: 'Meu dinheiro', icon: PiggyBank },
      { href: '/dashboard/financeiro/open-finance', label: 'Bancos conectados', icon: Building2 },
      { href: '/dashboard/emprestimos', label: 'Emprestimos', icon: Landmark },
      { href: '/dashboard/ai', label: 'Assistente', icon: Sparkles },
    ],
  },
  {
    title: 'Clientes',
    items: [
      { href: '/dashboard/clientes', label: 'Clientes', icon: Users },
      { href: '/dashboard/crm', label: 'Funil de vendas', icon: Target },
    ],
  },
  {
    title: 'Dia a dia',
    items: [
      { href: '/dashboard/tarefas', label: 'Tarefas', icon: ListChecks },
      { href: '/dashboard/calendario', label: 'Agenda', icon: CalendarDays },
      { href: '/dashboard/documentos', label: 'Documentos', icon: FileCheck },
    ],
  },
  {
    title: 'Produtos e vendas',
    items: [
      { href: '/dashboard/fornecedores', label: 'Fornecedores', icon: Truck },
      { href: '/dashboard/produtos', label: 'Produtos', icon: Package },
      { href: '/dashboard/estoque', label: 'Estoque', icon: PackageCheck },
      { href: '/dashboard/vendas', label: 'Vendas', icon: ShoppingCart },
      { href: '/dashboard/compras', label: 'Compras', icon: ClipboardList },
    ],
  },
  {
    title: 'Conta',
    items: [
      { href: '/dashboard/usuarios', label: 'Usuarios', icon: UserCog, adminOnly: true },
      { href: '/dashboard/admin/whatsapp', label: 'WhatsApp do robo', icon: QrCode, adminOnly: true },
      {
        href: '/dashboard/companies/activation-codes',
        label: 'Ativar empresas',
        icon: KeyRound,
        adminOnly: true,
      },
      { href: '/dashboard/configuracoes', label: 'Configuracoes', icon: Settings, adminOnly: true },
      { href: '/dashboard/assinatura', label: 'Plano e pagamento', icon: CreditCard, adminOnly: true },
      { href: '/dashboard/atividade', label: 'Historico', icon: Activity, adminOnly: true },
    ],
  },
];
