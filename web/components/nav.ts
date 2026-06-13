import {
  LayoutDashboard,
  LineChart,
  Wallet,
  Banknote,
  PiggyBank,
  Settings,
  List,
  BarChart2,
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
  {
    items: [
      { href: '/dashboard', label: 'Painel', icon: LayoutDashboard },
    ],
  },
  {
    title: 'Finanças',
    items: [
      { href: '/dashboard/financeiro/fluxo', label: 'Entradas e saídas', icon: LineChart },
      { href: '/dashboard/cobrancas', label: 'A receber', icon: Wallet },
      { href: '/dashboard/financeiro/pagar', label: 'A pagar', icon: Banknote },
      { href: '/dashboard/financeiro/pessoal', label: 'Meu dinheiro e metas', icon: PiggyBank },
      { href: '/dashboard/lancamentos', label: 'Lançamentos', icon: List },
      { href: '/dashboard/relatorios', label: 'Relatórios', icon: BarChart2 },
    ],
  },
  {
    title: 'Conta',
    items: [
      { href: '/dashboard/configuracoes', label: 'Configurações', icon: Settings },
    ],
  },
];
