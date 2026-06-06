import {
  Activity,
  Banknote,
  CalendarDays,
  FileCheck,
  FileText,
  KeyRound,
  LayoutDashboard,
  LineChart,
  ListChecks,
  PiggyBank,
  QrCode,
  Settings,
  Target,
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
      { href: '/dashboard/financeiro/pagar', label: 'Despesas', icon: Banknote },
      { href: '/dashboard/financeiro/fluxo', label: 'Fluxo de caixa', icon: LineChart },
      { href: '/dashboard/financeiro/dre', label: 'DRE', icon: FileText, adminOnly: true },
      { href: '/dashboard/financeiro/pessoal', label: 'Financas pessoais', icon: PiggyBank },
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
      { href: '/dashboard/atividade', label: 'Atividade', icon: Activity, adminOnly: true },
    ],
  },
];
