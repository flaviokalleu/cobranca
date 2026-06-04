import {
  LayoutDashboard,
  Wallet,
  Banknote,
  LineChart,
  FileText,
  ShoppingCart,
  Package,
  ArrowLeftRight,
  Truck,
  Building2,
  Target,
  ListChecks,
  FileCheck,
  CalendarDays,
  Bell,
  Bot,
  MessageCircle,
  QrCode,
  Users,
  UserCog,
  KeyRound,
  Settings,
  Activity,
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
      { href: '/dashboard/cobrancas', label: 'Contas a receber', icon: Wallet },
      { href: '/dashboard/financeiro/pagar', label: 'Contas a pagar', icon: Banknote },
      { href: '/dashboard/financeiro/fluxo', label: 'Fluxo de caixa', icon: LineChart },
      { href: '/dashboard/financeiro/dre', label: 'DRE', icon: FileText, adminOnly: true },
    ],
  },
  {
    title: 'Vendas',
    items: [{ href: '/dashboard/vendas', label: 'Pedidos', icon: ShoppingCart }],
  },
  {
    title: 'Estoque',
    items: [
      { href: '/dashboard/produtos', label: 'Produtos', icon: Package },
      { href: '/dashboard/estoque', label: 'Movimentações', icon: ArrowLeftRight },
    ],
  },
  {
    title: 'Compras',
    items: [
      { href: '/dashboard/compras', label: 'Pedidos de compra', icon: Truck },
      { href: '/dashboard/fornecedores', label: 'Fornecedores', icon: Building2 },
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
      { href: '/dashboard/notificacoes', label: 'Notificacoes', icon: Bell },
      { href: '/dashboard/assistente', label: 'Assistente IA', icon: Bot },
      { href: '/dashboard/whatsapp-financeiro', label: 'WhatsApp Financeiro', icon: MessageCircle },
    ],
  },
  {
    title: 'Cadastros',
    items: [{ href: '/dashboard/clientes', label: 'Clientes', icon: Users }],
  },
  {
    title: 'Sistema',
    items: [
      { href: '/dashboard/usuarios', label: 'Usuários', icon: UserCog, adminOnly: true },
      { href: '/dashboard/admin/whatsapp', label: 'WhatsApp do Robo', icon: QrCode, adminOnly: true },
      { href: '/dashboard/companies/activation-codes', label: 'Codigos de ativacao', icon: KeyRound, adminOnly: true },
      { href: '/dashboard/configuracoes', label: 'Configurações', icon: Settings, adminOnly: true },
      { href: '/dashboard/atividade', label: 'Atividade', icon: Activity, adminOnly: true },
    ],
  },
];
