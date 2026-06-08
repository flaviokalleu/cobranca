'use client';

import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import {
  Building2, RefreshCw, Trash2, Plus, TrendingUp, TrendingDown,
  Wallet, CreditCard, AlertCircle, CheckCircle2, Clock, WifiOff,
  ChevronRight, ArrowDownRight, ArrowUpRight,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';

const brl = (cents: number) =>
  (cents / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

const fmt = (d: string | null | undefined) =>
  d ? new Date(d).toLocaleDateString('pt-BR') : 'â€”';

// â”€â”€â”€ Types â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

interface Connection {
  id: string;
  connector: string;
  status: string;
  lastSyncAt: string | null;
  accounts: BankAccount[];
}

interface BankAccount {
  id: string;
  name: string;
  type: string;
  subtype?: string;
  balanceCents: number;
  currency: string;
  connection?: { connector: string; status: string };
}

interface OFTransaction {
  id: string;
  type: string;
  amountCents: number;
  description: string;
  category?: string;
  date: string;
  counterpartyName?: string;
  paymentMethod?: string;
  account?: { name: string; type: string; connection?: { connector: string } };
}

interface Summary {
  totalBalanceCents: number;
  totalCreditCents: number;
  connections: number;
  accounts: number;
  lastSyncAt: string | null;
}

// â”€â”€â”€ Status badge â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

const STATUS_MAP: Record<string, { label: string; icon: React.ReactNode; color: string }> = {
  UPDATED:     { label: 'Atualizado',      icon: <CheckCircle2 size={14} />, color: 'text-green-400' },
  UPDATING:    { label: 'Sincronizando',   icon: <RefreshCw size={14} className="animate-spin" />, color: 'text-yellow-400' },
  LOGIN_ERROR: { label: 'Erro de login',   icon: <AlertCircle size={14} />, color: 'text-red-400' },
  OUTDATED:    { label: 'Desatualizado',   icon: <Clock size={14} />, color: 'text-orange-400' },
  ERROR:       { label: 'Erro',            icon: <WifiOff size={14} />, color: 'text-red-500' },
  WAITING_USER_INPUT: { label: 'Aguardando', icon: <Clock size={14} />, color: 'text-blue-400' },
};

function StatusBadge({ status }: { status: string }) {
  const s = STATUS_MAP[status] ?? { label: status, icon: null, color: 'text-slate-400' };
  return (
    <span className={`flex items-center gap-1 text-xs ${s.color}`}>
      {s.icon} {s.label}
    </span>
  );
}

// â”€â”€â”€ Page â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export default function OpenFinancePage() {
  const [summary, setSummary] = useState<Summary | null>(null);
  const [connections, setConnections] = useState<Connection[]>([]);
  const [accounts, setAccounts] = useState<BankAccount[]>([]);
  const [transactions, setTransactions] = useState<OFTransaction[]>([]);
  const [txTotal, setTxTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadingTx, setLoadingTx] = useState(false);

  // Filters
  const [filterAccount, setFilterAccount] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [filterFrom, setFilterFrom] = useState('');
  const [filterTo, setFilterTo] = useState('');
  const [page, setPage] = useState(1);

  // Connect modal
  const [showConnect, setShowConnect] = useState(false);
  const [connecting, setConnecting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const [s, c, a] = await Promise.all([
      api<Summary>('GET', '/open-finance/summary'),
      api<Connection[]>('GET', '/open-finance/connections'),
      api<BankAccount[]>('GET', '/open-finance/accounts'),
    ]);
    if (s.status === 200) setSummary(s.data);
    if (c.status === 200) setConnections(c.data);
    if (a.status === 200) setAccounts(a.data);
    setLoading(false);
  }, []);

  const loadTransactions = useCallback(async () => {
    setLoadingTx(true);
    const params = new URLSearchParams({ page: String(page), limit: '50' });
    if (filterAccount) params.set('accountId', filterAccount);
    if (filterCategory) params.set('category', filterCategory);
    if (filterFrom) params.set('from', filterFrom);
    if (filterTo) params.set('to', filterTo);
    const r = await api<{ total: number; items: OFTransaction[] }>('GET', `/open-finance/transactions?${params}`);
    if (r.status === 200) {
      setTransactions(r.data.items);
      setTxTotal(r.data.total);
    }
    setLoadingTx(false);
  }, [filterAccount, filterCategory, filterFrom, filterTo, page]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { loadTransactions(); }, [loadTransactions]);

  const handleConnect = async () => {
    setConnecting(true);
    const r = await api<{ accessToken: string }>('POST', '/open-finance/connect-token', {});
    if (r.status !== 201 && r.status !== 200) {
      toast.error('Erro ao iniciar conexÃ£o');
      setConnecting(false);
      return;
    }
    // Open Pluggy Connect Widget
    const token = r.data.accessToken;
    const script = document.createElement('script');
    script.src = 'https://cdn.pluggy.ai/pluggy-connect/v2/pluggy-connect.js';
    script.onload = () => {
      // @ts-expect-error global Pluggy widget
      const widget = new window.PluggyConnect({
        connectToken: token,
        onSuccess: async ({ item }: { item: { id: string } }) => {
          toast.success(`Banco conectado! (item: ${item.id})`);
          setShowConnect(false);
          await load();
        },
        onError: (err: unknown) => {
          toast.error(`Erro na conexÃ£o: ${String(err)}`);
        },
        onClose: () => {
          setConnecting(false);
        },
      });
      widget.init();
    };
    document.head.appendChild(script);
  };

  const handleDelete = async (id: string, connector: string) => {
    if (!confirm(`Desconectar ${connector}? As transaÃ§Ãµes sincronizadas serÃ£o removidas.`)) return;
    const r = await api('DELETE', `/open-finance/connections/${id}`);
    if (r.status === 200 || r.status === 204) {
      toast.success('ConexÃ£o removida');
      load();
    } else {
      toast.error('Erro ao remover conexÃ£o');
    }
  };

  // Build bar chart data from transactions (last 30 days by category)
  const categoryData = (() => {
    const map: Record<string, number> = {};
    transactions
      .filter((t) => t.type === 'DEBIT')
      .forEach((t) => {
        const cat = t.category ?? 'Outros';
        map[cat] = (map[cat] ?? 0) + t.amountCents;
      });
    return Object.entries(map)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .map(([name, value]) => ({ name, value: value / 100 }));
  })();

  const totalPages = Math.ceil(txTotal / 50);

  return (
    <div className="flex flex-col gap-6 p-6 min-h-screen bg-[#0a0a0f] text-slate-100">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Building2 size={24} className="text-violet-400" />
            Bancos conectados
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Conecte suas contas bancÃ¡rias e visualize tudo em um sÃ³ lugar
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={load} className="border-slate-700 text-slate-300">
            <RefreshCw size={14} className="mr-1" /> Atualizar
          </Button>
          <Button size="sm" onClick={() => setShowConnect(true)} className="bg-violet-600 hover:bg-violet-700">
            <Plus size={14} className="mr-1" /> Conectar banco
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      {summary && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <SummaryCard
            label="Saldo total"
            value={brl(summary.totalBalanceCents)}
            icon={<Wallet size={20} className="text-green-400" />}
            sub={`${summary.accounts} conta${summary.accounts !== 1 ? 's' : ''}`}
            positive
          />
          <SummaryCard
            label="CartÃµes de crÃ©dito"
            value={brl(summary.totalCreditCents)}
            icon={<CreditCard size={20} className="text-blue-400" />}
            sub="saldo devedor"
          />
          <SummaryCard
            label="Bancos conectados"
            value={String(summary.connections)}
            icon={<Building2 size={20} className="text-violet-400" />}
            sub={summary.lastSyncAt ? `Sync ${fmt(summary.lastSyncAt)}` : 'Nunca sincronizado'}
          />
          <SummaryCard
            label="TransaÃ§Ãµes"
            value={String(txTotal)}
            icon={<TrendingUp size={20} className="text-yellow-400" />}
            sub="carregadas"
          />
        </div>
      )}

      {/* Connections */}
      <Section title="Bancos conectados">
        {loading ? (
          <p className="text-slate-500 text-sm">Carregando...</p>
        ) : connections.length === 0 ? (
          <div className="text-center py-10 text-slate-500">
            <Building2 size={48} className="mx-auto mb-3 opacity-30" />
            <p>Nenhum banco conectado ainda.</p>
            <Button className="mt-3 bg-violet-600 hover:bg-violet-700" onClick={() => setShowConnect(true)}>
              <Plus size={14} className="mr-1" /> Conectar agora
            </Button>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {connections.map((c) => (
              <div key={c.id} className="bg-slate-800/50 border border-slate-700 rounded-xl p-4">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <p className="font-semibold text-white">{c.connector}</p>
                    <StatusBadge status={c.status} />
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-red-400 hover:text-red-300 hover:bg-red-900/20"
                    onClick={() => handleDelete(c.id, c.connector)}
                  >
                    <Trash2 size={14} />
                  </Button>
                </div>
                <p className="text-xs text-slate-500 mb-3">
                  Ãšltima sync: {fmt(c.lastSyncAt)}
                </p>
                <div className="space-y-1">
                  {c.accounts.map((a) => (
                    <div key={a.id} className="flex items-center justify-between text-xs">
                      <span className="text-slate-400 flex items-center gap-1">
                        {a.type === 'CREDIT' ? <CreditCard size={11} /> : <Wallet size={11} />}
                        {a.name}
                      </span>
                      <span className={a.balanceCents >= 0 ? 'text-green-400' : 'text-red-400'}>
                        {brl(a.balanceCents)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </Section>

      {/* Category Chart */}
      {categoryData.length > 0 && (
        <Section title="Gastos por categoria (perÃ­odo filtrado)">
          <div className="h-52">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={categoryData} layout="vertical" margin={{ left: 16 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis type="number" tick={{ fill: '#94a3b8', fontSize: 11 }}
                  tickFormatter={(v) => `R$${(v as number).toFixed(0)}`} />
                <YAxis type="category" dataKey="name" tick={{ fill: '#94a3b8', fontSize: 11 }} width={100} />
                <Tooltip formatter={(v) => [`R$ ${(v as number).toFixed(2)}`, 'Gasto']}
                  contentStyle={{ background: '#1e293b', border: '1px solid #334155' }} />
                <Bar dataKey="value" fill="#8b5cf6" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Section>
      )}

      {/* Transactions */}
      <Section title={`TransaÃ§Ãµes (${txTotal} ao todo)`}>
        {/* Filters */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
          <div>
            <Label className="text-xs text-slate-400 mb-1 block">Conta</Label>
            <Select value={filterAccount} onValueChange={(v) => { setFilterAccount(v === 'all' ? '' : v); setPage(1); }}>
              <SelectTrigger className="h-8 text-xs bg-slate-800 border-slate-700">
                <SelectValue placeholder="Todas as contas" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas as contas</SelectItem>
                {accounts.map((a) => (
                  <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs text-slate-400 mb-1 block">Categoria</Label>
            <Input
              value={filterCategory}
              onChange={(e) => { setFilterCategory(e.target.value); setPage(1); }}
              placeholder="Ex: AlimentaÃ§Ã£o"
              className="h-8 text-xs bg-slate-800 border-slate-700"
            />
          </div>
          <div>
            <Label className="text-xs text-slate-400 mb-1 block">De</Label>
            <Input type="date" value={filterFrom} onChange={(e) => { setFilterFrom(e.target.value); setPage(1); }}
              className="h-8 text-xs bg-slate-800 border-slate-700" />
          </div>
          <div>
            <Label className="text-xs text-slate-400 mb-1 block">AtÃ©</Label>
            <Input type="date" value={filterTo} onChange={(e) => { setFilterTo(e.target.value); setPage(1); }}
              className="h-8 text-xs bg-slate-800 border-slate-700" />
          </div>
        </div>

        {/* Table */}
        {loadingTx ? (
          <p className="text-slate-500 text-sm text-center py-8">Carregando transaÃ§Ãµes...</p>
        ) : transactions.length === 0 ? (
          <p className="text-slate-500 text-sm text-center py-8">Nenhuma transaÃ§Ã£o encontrada.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-slate-500 text-xs border-b border-slate-800">
                  <th className="text-left py-2 pr-3">Data</th>
                  <th className="text-left py-2 pr-3">DescriÃ§Ã£o</th>
                  <th className="text-left py-2 pr-3 hidden md:table-cell">Categoria</th>
                  <th className="text-left py-2 pr-3 hidden lg:table-cell">Conta</th>
                  <th className="text-right py-2">Valor</th>
                </tr>
              </thead>
              <tbody>
                {transactions.map((t) => (
                  <tr key={t.id} className="border-b border-slate-800/60 hover:bg-slate-800/30 transition-colors">
                    <td className="py-2 pr-3 text-slate-400 whitespace-nowrap">
                      {new Date(t.date).toLocaleDateString('pt-BR')}
                    </td>
                    <td className="py-2 pr-3">
                      <p className="text-slate-200 truncate max-w-[200px]">{t.description}</p>
                      {t.counterpartyName && (
                        <p className="text-xs text-slate-500">{t.counterpartyName}</p>
                      )}
                    </td>
                    <td className="py-2 pr-3 hidden md:table-cell">
                      <span className="text-xs bg-slate-700 text-slate-300 px-2 py-0.5 rounded-full">
                        {t.category ?? 'â€”'}
                      </span>
                    </td>
                    <td className="py-2 pr-3 text-slate-400 text-xs hidden lg:table-cell">
                      {t.account?.connection?.connector} Â· {t.account?.name}
                    </td>
                    <td className="py-2 text-right whitespace-nowrap">
                      <span className={`font-semibold flex items-center justify-end gap-1 ${t.type === 'CREDIT' ? 'text-green-400' : 'text-red-400'}`}>
                        {t.type === 'CREDIT' ? <ArrowDownRight size={13} /> : <ArrowUpRight size={13} />}
                        {brl(t.amountCents)}
                      </span>
                      {t.paymentMethod && (
                        <span className="text-xs text-slate-500">{t.paymentMethod}</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between mt-4">
            <Button variant="outline" size="sm" disabled={page <= 1}
              onClick={() => setPage((p) => p - 1)} className="border-slate-700 text-slate-300">
              Anterior
            </Button>
            <span className="text-sm text-slate-400">PÃ¡gina {page} de {totalPages}</span>
            <Button variant="outline" size="sm" disabled={page >= totalPages}
              onClick={() => setPage((p) => p + 1)} className="border-slate-700 text-slate-300">
              PrÃ³xima
            </Button>
          </div>
        )}
      </Section>

      {/* Connect Modal */}
      {showConnect && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl p-8 w-full max-w-md shadow-2xl">
            <div className="flex items-center gap-3 mb-4">
              <Building2 size={28} className="text-violet-400" />
              <div>
                <h2 className="text-lg font-bold text-white">Conectar banco</h2>
                <p className="text-sm text-slate-400">Via Bancos conectados</p>
              </div>
            </div>
            <p className="text-sm text-slate-300 mb-6">
              VocÃª serÃ¡ direcionado ao widget seguro do Pluggy para autorizar o acesso
              Ã s suas contas. A conexÃ£o usa o padrÃ£o Bancos conectados do Banco Central.
            </p>
            <div className="bg-slate-800 rounded-xl p-4 mb-6 text-xs text-slate-400 space-y-1">
              <p>âœ“ Leitura de saldo e extrato</p>
              <p>âœ“ Sem permissÃ£o para movimentaÃ§Ãµes</p>
              <p>âœ“ Revogue a qualquer momento</p>
              <p>âœ“ Dados criptografados em trÃ¢nsito</p>
            </div>
            <div className="flex gap-3">
              <Button variant="outline" className="flex-1 border-slate-700 text-slate-300"
                onClick={() => setShowConnect(false)}>
                Cancelar
              </Button>
              <Button className="flex-1 bg-violet-600 hover:bg-violet-700"
                onClick={handleConnect} disabled={connecting}>
                {connecting ? <RefreshCw size={14} className="animate-spin mr-2" /> : <ChevronRight size={14} className="mr-2" />}
                Conectar agora
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// â”€â”€â”€ Sub-components â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

function SummaryCard({
  label, value, icon, sub, positive,
}: {
  label: string; value: string; icon: React.ReactNode; sub?: string; positive?: boolean;
}) {
  return (
    <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-4">
      <div className="flex items-center justify-between mb-2">
        <p className="text-xs text-slate-400">{label}</p>
        {icon}
      </div>
      <p className={`text-xl font-bold ${positive ? 'text-green-400' : 'text-white'}`}>{value}</p>
      {sub && <p className="text-xs text-slate-500 mt-1">{sub}</p>}
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6">
      <h2 className="text-sm font-semibold text-slate-300 uppercase tracking-wide mb-4">{title}</h2>
      {children}
    </div>
  );
}


