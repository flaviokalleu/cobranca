import { Activity, AlertTriangle, Bot, Clock, MessageSquare, Phone } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { WhatsappStatus } from '@/services/whatsappAdminApi';
import { WhatsAppStatusBadge } from './WhatsAppStatusBadge';

function fmt(value?: string | null) {
  if (!value) return 'Nunca';
  return new Date(value).toLocaleString('pt-BR');
}

export function WhatsAppConnectionCard({ status }: { status: WhatsappStatus }) {
  const cards = [
    {
      label: 'Status da conexao',
      value: <WhatsAppStatusBadge status={status.status} />,
      icon: Activity,
    },
    { label: 'Numero conectado', value: status.phone ?? 'Nao conectado', icon: Phone },
    { label: 'Nome do perfil', value: status.profileName ?? 'Nao identificado', icon: Bot },
    { label: 'Ultima atualizacao', value: fmt(status.lastUpdate), icon: Clock },
    { label: 'Mensagens recebidas', value: 'Metricas em coleta', icon: MessageSquare },
    { label: 'Comprovantes processados', value: 'Metricas em coleta', icon: Activity },
    { label: 'Erro recente', value: status.lastError ?? 'Nenhum erro recente', icon: AlertTriangle },
  ];

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
      {cards.map((card) => {
        const Icon = card.icon;
        return (
          <Card key={card.label}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{card.label}</CardTitle>
              <Icon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="min-h-7 text-sm font-semibold">{card.value}</div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
