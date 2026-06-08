import type { ReactNode } from 'react';
import Link from 'next/link';
import { ChevronRight, Home } from 'lucide-react';
import { NotificationBell } from '@/components/notification-bell';

interface PageHeaderProps {
  title: string;
  description?: string;
  actions?: ReactNode;
  children?: ReactNode;
  breadcrumb?: string;
}

const defaultDescriptions: Record<string, string> = {
  Clientes: 'Pessoas e empresas que compram de voce.',
  Checklist: 'Tarefas do dia, responsaveis e prazos.',
  Avisos: 'Mensagens novas e lembretes importantes.',
  Tarefas: 'Tarefas do dia, responsaveis e prazos.',
  Calendario: 'Vencimentos, tarefas e compromissos.',
  Documentos: 'Arquivos e pendencias dos clientes.',
  Notificacoes: 'Avisos importantes do sistema.',
  Usuarios: 'Pessoas que acessam a empresa.',
  Configuracoes: 'Dados da empresa, PIX, avisos e seguranca.',
  Historico: 'O que aconteceu no sistema.',
  Atividade: 'Historico do que aconteceu no sistema.',
  Assinatura: 'Plano, limites e pagamento da empresa.',
};

export function PageHeader({ title, description, actions, children, breadcrumb }: PageHeaderProps) {
  const finalDescription = description ?? defaultDescriptions[title];

  return (
    <header
      className="sticky top-0 z-10 flex min-h-16 flex-col gap-3 border-b bg-white/95 px-4 py-3 backdrop-blur sm:flex-row sm:items-center sm:justify-between sm:px-6"
      style={{ borderColor: '#e5e7eb' }}
    >
      <div className="min-w-0">
        <div className="mb-1 flex items-center gap-1.5 text-xs" style={{ color: '#6b7280' }}>
          <Link href="/dashboard" className="flex items-center gap-1 hover:text-gray-900 transition-colors">
            <Home className="h-3 w-3" />
            Painel
          </Link>
          <ChevronRight className="h-3 w-3" />
          <span style={{ color: '#111827' }} className="truncate font-medium">{breadcrumb ?? title}</span>
        </div>
        <h1 className="text-xl font-semibold text-gray-950">{title}</h1>
        {finalDescription && <p className="mt-0.5 max-w-3xl text-sm leading-5 text-gray-600">{finalDescription}</p>}
      </div>
      <div className="flex shrink-0 flex-wrap items-center gap-2">
        <NotificationBell />
        {actions ?? children}
      </div>
    </header>
  );
}
