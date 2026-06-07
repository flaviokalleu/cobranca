import { AlertTriangle, BarChart3, FileCheck2, MessageSquare } from 'lucide-react';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { WhatsappMetrics } from '@/services/whatsappAdminApi';

const fmtDay = (date: string) =>
  new Date(`${date}T00:00:00`).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });

export function WhatsAppMetricsPanel({ metrics }: { metrics: WhatsappMetrics }) {
  const cards = [
    { label: 'Mensagens 7 dias', value: metrics.totalMessages, icon: MessageSquare },
    { label: 'Comprovantes', value: metrics.receiptsProcessed, icon: FileCheck2 },
    { label: 'Erros', value: metrics.errorCount, icon: AlertTriangle },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <BarChart3 className="h-4 w-4" />
          Metricas do bot
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="grid gap-3 sm:grid-cols-3">
          {cards.map((card) => {
            const Icon = card.icon;
            return (
              <div key={card.label} className="rounded-md border border-border bg-muted/30 p-3">
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>{card.label}</span>
                  <Icon className="h-4 w-4" />
                </div>
                <p className="mt-2 text-2xl font-semibold tabular-nums text-foreground">{card.value}</p>
              </div>
            );
          })}
        </div>

        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={metrics.series.map((row) => ({ ...row, label: fmtDay(row.date) }))}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="label" tick={{ fontSize: 11 }} />
              <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
              <Tooltip />
              <Bar dataKey="inbound" name="Recebidas" fill="#2563eb" radius={[4, 4, 0, 0]} />
              <Bar dataKey="outbound" name="Enviadas" fill="#16a34a" radius={[4, 4, 0, 0]} />
              <Bar dataKey="processed" name="Processadas" fill="#7c3aed" radius={[4, 4, 0, 0]} />
              <Bar dataKey="errors" name="Erros" fill="#dc2626" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
