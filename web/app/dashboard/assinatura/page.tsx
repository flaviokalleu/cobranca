'use client';

import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { useAppSelector } from '@/store/hooks';
import { api } from '@/lib/api';
import { PageHeader } from '@/components/page-header';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Check, CreditCard, Zap } from 'lucide-react';

interface Plan {
  id: string;
  code: string;
  name: string;
  priceCents: number;
  maxUsers: number;
  maxChargesMonth: number;
}

interface Subscription {
  planCode: string;
  status: string;
  currentPeriodEnd?: string | null;
}

const brl = (cents: number) =>
  cents === 0
    ? 'Grátis'
    : (cents / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

const fmtDate = (iso?: string | null) =>
  iso ? new Date(iso).toLocaleDateString('pt-BR') : '—';

function StatusBadge({ status }: { status: string }) {
  if (status === 'ACTIVE') return <Badge variant="success">Ativa</Badge>;
  if (status === 'TRIALING') return <Badge variant="warning">Período de teste</Badge>;
  if (status === 'PAST_DUE') return <Badge variant="destructive">Pagamento em atraso</Badge>;
  if (status === 'CANCELED') return <Badge variant="secondary">Cancelada</Badge>;
  return <Badge>{status}</Badge>;
}

export default function AssinaturaPage() {
  const role = useAppSelector((s) => s.auth.role);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [changing, setChanging] = useState<string | null>(null);

  useEffect(() => {
    void load();
  }, []);

  async function load() {
    const [plansRes, subRes] = await Promise.all([
      api<Plan[]>('GET', '/plans'),
      api<Subscription>('GET', '/subscription'),
    ]);
    if (Array.isArray(plansRes.data)) setPlans(plansRes.data);
    if (subRes.data && typeof subRes.data === 'object') setSubscription(subRes.data as Subscription);
  }

  async function handleChangePlan(planCode: string) {
    if (role !== 'ADMIN') { toast.error('Apenas administradores podem alterar o plano.'); return; }
    if (!confirm(`Alterar para o plano ${planCode}?`)) return;
    setChanging(planCode);
    const { status } = await api('POST', '/subscription/change', { planCode });
    setChanging(null);
    if (status < 300) {
      toast.success('Plano alterado com sucesso!');
      await load();
    } else {
      toast.error('Erro ao alterar plano.');
    }
  }

  const planFeatures: Record<string, string[]> = {
    FREE: ['Até 3 usuários', 'Até 50 cobranças/mês', 'WhatsApp bot básico', 'Suporte por e-mail'],
    PRO: ['Até 10 usuários', 'Cobranças ilimitadas', 'Open Finance (Pluggy)', 'IA Financeira (DeepSeek)', 'Suporte prioritário'],
    BUSINESS: ['Usuários ilimitados', 'Cobranças ilimitadas', 'Todos os módulos ERP', 'API dedicada', 'Suporte 24/7 + SLA'],
  };

  return (
    <div className="flex flex-col gap-6 p-6">
      <PageHeader
        title="Assinatura"
        description="Gerencie o plano da sua empresa."
      />

      {/* Status atual */}
      {subscription && (
        <Card className="flex items-center justify-between p-5">
          <div className="flex items-center gap-3">
            <div className="rounded-full bg-primary/10 p-2">
              <CreditCard className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="font-medium">
                Plano atual: <span className="text-primary">{subscription.planCode}</span>
              </p>
              <p className="text-sm text-gray-500">
                Renova em {fmtDate(subscription.currentPeriodEnd)}
              </p>
            </div>
          </div>
          <StatusBadge status={subscription.status} />
        </Card>
      )}

      {/* Cards de plano */}
      <div className="grid gap-4 sm:grid-cols-3">
        {plans.map((plan) => {
          const isCurrent = subscription?.planCode === plan.code;
          const features = planFeatures[plan.code] ?? [];
          return (
            <Card
              key={plan.id}
              className={`relative flex flex-col gap-4 p-5 ${isCurrent ? 'border-2 border-primary' : ''}`}
            >
              {isCurrent && (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-primary px-3 py-0.5 text-xs font-semibold text-primary-foreground">
                  Plano atual
                </span>
              )}
              <div>
                <div className="flex items-center gap-2">
                  <Zap className="h-4 w-4 text-primary" />
                  <h3 className="font-semibold">{plan.name}</h3>
                </div>
                <p className="mt-1 text-2xl font-bold">
                  {brl(plan.priceCents)}
                  {plan.priceCents > 0 && <span className="text-sm font-normal text-gray-400">/mês</span>}
                </p>
              </div>
              <ul className="flex flex-col gap-1.5 text-sm text-gray-600">
                {features.map((f, i) => (
                  <li key={i} className="flex items-center gap-2">
                    <Check className="h-3.5 w-3.5 shrink-0 text-green-500" />
                    {f}
                  </li>
                ))}
              </ul>
              <Button
                className="mt-auto"
                variant={isCurrent ? 'outline' : 'default'}
                disabled={isCurrent || changing === plan.code || role !== 'ADMIN'}
                onClick={() => void handleChangePlan(plan.code)}
              >
                {isCurrent ? 'Plano ativo' : changing === plan.code ? 'Aguarde...' : 'Selecionar'}
              </Button>
            </Card>
          );
        })}
      </div>

      {role !== 'ADMIN' && (
        <p className="text-center text-sm text-gray-400">
          Apenas administradores podem alterar o plano.
        </p>
      )}
    </div>
  );
}
