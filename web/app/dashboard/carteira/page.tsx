'use client';

import { useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { fetchPersonalFinance, createPersonalAccount, createPersonalCard, deletePersonalAccount } from '@/store/personalFinanceSlice';
import {
  fetchOpenFinanceConnections,
  createConnectToken,
  deleteOpenFinanceConnection,
} from '@/store/openFinanceSlice';
import {
  Landmark, CreditCard, Plus, Trash2, RefreshCw, Link2, CheckCircle2,
  AlertCircle, Clock, Wallet, HelpCircle, X,
} from 'lucide-react';

const brl = (cents: number) =>
  (cents / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

const ACCOUNT_TYPES = [
  { value: 'CHECKING', label: 'Conta corrente' },
  { value: 'SAVINGS',  label: 'Poupança' },
  { value: 'CASH',     label: 'Dinheiro em espécie' },
  { value: 'OTHER',    label: 'Outra' },
];

function StatusBadge({ status }: { status: string }) {
  if (status === 'UPDATED') return (
    <span className="flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-semibold text-emerald-700">
      <CheckCircle2 className="h-3 w-3" /> Sincronizado
    </span>
  );
  if (status === 'UPDATING') return (
    <span className="flex items-center gap-1 rounded-full bg-yellow-100 px-2 py-0.5 text-[11px] font-semibold text-yellow-700">
      <Clock className="h-3 w-3" /> Atualizando...
    </span>
  );
  return (
    <span className="flex items-center gap-1 rounded-full bg-red-100 px-2 py-0.5 text-[11px] font-semibold text-red-700">
      <AlertCircle className="h-3 w-3" /> Erro
    </span>
  );
}

export default function CarteiraPage() {
  const dispatch = useAppDispatch();
  const { accounts, cards } = useAppSelector((s) => s.personalFinance);
  const { connections, loading: ofLoading } = useAppSelector((s) => s.openFinance);

  const [showAddAccount, setShowAddAccount] = useState(false);
  const [showAddCard,    setShowAddCard]    = useState(false);
  const [showPluggyHelp, setShowPluggyHelp] = useState(false);
  const [connecting,     setConnecting]     = useState(false);
  const pluggyScriptRef = useRef(false);

  // form conta
  const [accName,    setAccName]    = useState('');
  const [accType,    setAccType]    = useState('CHECKING');
  const [accBalance, setAccBalance] = useState('');
  const [savingAcc,  setSavingAcc]  = useState(false);

  // form cartão
  const [cardName,   setCardName]   = useState('');
  const [cardLimit,  setCardLimit]  = useState('');
  const [savingCard, setSavingCard] = useState(false);

  useEffect(() => {
    void dispatch(fetchPersonalFinance());
    void dispatch(fetchOpenFinanceConnections());
  }, [dispatch]);

  // Totais
  const totalManual = accounts.filter(a => a.active !== false).reduce((s, a) => s + a.balanceCents, 0);
  const totalBanks  = connections.flatMap(c => c.accounts).reduce((s, a) => s + a.balanceCents, 0);
  const totalGeral  = totalManual + totalBanks;

  // Salvar conta manual
  async function saveAccount(e: React.FormEvent) {
    e.preventDefault();
    if (!accName.trim()) return;
    setSavingAcc(true);
    const balanceCents = Math.round(parseFloat(accBalance.replace(',', '.') || '0') * 100);
    const res = await dispatch(createPersonalAccount({ name: accName.trim(), type: accType, balanceCents }));
    setSavingAcc(false);
    if (createPersonalAccount.fulfilled.match(res)) {
      toast.success('Conta adicionada!');
      setAccName(''); setAccBalance(''); setShowAddAccount(false);
    } else toast.error('Erro ao salvar');
  }

  // Salvar cartão
  async function saveCard(e: React.FormEvent) {
    e.preventDefault();
    if (!cardName.trim()) return;
    setSavingCard(true);
    const limitCents = Math.round(parseFloat(cardLimit.replace(',', '.') || '0') * 100);
    const res = await dispatch(createPersonalCard({ name: cardName.trim(), limitCents }));
    setSavingCard(false);
    if (createPersonalCard.fulfilled.match(res)) {
      toast.success('Cartão adicionado!');
      setCardName(''); setCardLimit(''); setShowAddCard(false);
    } else toast.error('Erro ao salvar');
  }

  // Conectar banco via Pluggy
  async function handleConnectBank() {
    setConnecting(true);
    const res = await dispatch(createConnectToken(undefined));
    setConnecting(false);
    if (!createConnectToken.fulfilled.match(res)) {
      toast.error('Não foi possível iniciar conexão com o banco');
      return;
    }
    const token = res.payload as string;

    // Carregar script Pluggy dinamicamente
    if (!pluggyScriptRef.current) {
      await new Promise<void>((resolve) => {
        const s = document.createElement('script');
        s.src = 'https://cdn.pluggy.ai/pluggy-connect/v2/pluggy-connect.js';
        s.onload = () => { pluggyScriptRef.current = true; resolve(); };
        document.head.appendChild(s);
      });
    }

    // Abrir widget Pluggy
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const PluggyConnect = (window as any).PluggyConnect;
    if (!PluggyConnect) { toast.error('Widget indisponível'); return; }

    new PluggyConnect({
      connectToken: token,
      onSuccess: () => {
        toast.success('Banco conectado! Importando transações...');
        setTimeout(() => void dispatch(fetchOpenFinanceConnections()), 3000);
      },
      onError: () => toast.error('Não foi possível conectar o banco'),
    }).init();
  }

  async function removeConnection(id: string, name: string) {
    if (!window.confirm(`Desconectar "${name}"? As transações importadas serão mantidas.`)) return;
    const res = await dispatch(deleteOpenFinanceConnection(id));
    if (deleteOpenFinanceConnection.fulfilled.match(res)) toast.success('Banco desconectado');
    else toast.error('Erro ao desconectar');
  }

  async function removeAccount(id: string, name: string) {
    if (!window.confirm(`Remover conta "${name}"?`)) return;
    const res = await dispatch(deletePersonalAccount(id));
    if (deletePersonalAccount.fulfilled.match(res)) toast.success('Conta removida');
    else toast.error('Erro ao remover');
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="sticky top-0 z-10 border-b border-gray-100 bg-white">
        <div className="mx-auto flex h-14 max-w-2xl items-center justify-between px-4">
          <h1 className="text-sm font-bold text-gray-900">Minha Carteira</h1>
          <span className="text-xs text-gray-400">Tudo que você tem, em um lugar só</span>
        </div>
      </div>

      <div className="mx-auto max-w-2xl space-y-4 p-4">

        {/* Card saldo total */}
        <div className="rounded-2xl p-6 text-white" style={{ background: 'linear-gradient(135deg,#6366f1,#4f46e5)' }}>
          <p className="text-xs font-semibold uppercase tracking-wider opacity-80">Patrimônio total</p>
          <p className="mt-1 text-4xl font-bold tabular-nums">{brl(totalGeral)}</p>
          <div className="mt-4 grid grid-cols-2 gap-3">
            <div className="rounded-xl bg-white/20 px-4 py-3">
              <p className="text-xs font-semibold uppercase opacity-80">Contas manuais</p>
              <p className="mt-1 text-lg font-bold tabular-nums">{brl(totalManual)}</p>
            </div>
            <div className="rounded-xl bg-white/20 px-4 py-3">
              <p className="text-xs font-semibold uppercase opacity-80">Contas no banco</p>
              <p className="mt-1 text-lg font-bold tabular-nums">{brl(totalBanks)}</p>
            </div>
          </div>
        </div>

        {/* ─── CONECTAR BANCO ─────────────────────────────────────── */}
        <div className="rounded-2xl bg-white p-5" style={{ border: '1px solid #e5e7eb' }}>
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="text-sm font-bold text-gray-900">Bancos conectados</h2>
              <p className="text-xs text-gray-400">Veja o saldo do seu banco aqui automaticamente</p>
            </div>
            <button
              onClick={() => setShowPluggyHelp(true)}
              className="flex h-7 w-7 items-center justify-center rounded-full text-gray-400 hover:bg-gray-100"
            >
              <HelpCircle className="h-4 w-4" />
            </button>
          </div>

          {connections.length === 0 && !ofLoading ? (
            <div className="mb-4 rounded-xl bg-indigo-50 p-4 text-center">
              <Landmark className="mx-auto mb-2 h-8 w-8 text-indigo-400" />
              <p className="text-sm font-semibold text-indigo-700">Nenhum banco conectado ainda</p>
              <p className="mt-1 text-xs text-indigo-500">
                Conecte seu banco para ver o saldo e transações automáticas aqui
              </p>
            </div>
          ) : (
            <div className="mb-4 space-y-3">
              {connections.map((conn) => (
                <div key={conn.id} className="rounded-xl border border-gray-100 bg-gray-50 p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="flex h-9 w-9 items-center justify-center rounded-full bg-white shadow-sm">
                        <Landmark className="h-4 w-4 text-indigo-500" />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-gray-800">{conn.connector}</p>
                        <StatusBadge status={conn.status} />
                      </div>
                    </div>
                    <button
                      onClick={() => void removeConnection(conn.id, conn.connector)}
                      className="flex h-7 w-7 items-center justify-center rounded-lg text-gray-300 hover:bg-red-50 hover:text-red-400"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                  {conn.accounts.length > 0 && (
                    <div className="mt-3 space-y-1.5">
                      {conn.accounts.map((acc) => (
                        <div key={acc.id} className="flex items-center justify-between rounded-lg bg-white px-3 py-2">
                          <span className="text-xs text-gray-600">{acc.name}</span>
                          <span className="text-xs font-bold text-gray-900 tabular-nums">{brl(acc.balanceCents)}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          <button
            onClick={() => void handleConnectBank()}
            disabled={connecting}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 py-3 text-sm font-bold text-white transition hover:bg-indigo-700 disabled:opacity-50"
          >
            {connecting ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Link2 className="h-4 w-4" />}
            {connecting ? 'Conectando...' : 'Conectar meu banco'}
          </button>
        </div>

        {/* ─── CONTAS MANUAIS ──────────────────────────────────────── */}
        <div className="rounded-2xl bg-white overflow-hidden" style={{ border: '1px solid #e5e7eb' }}>
          <div className="flex items-center justify-between border-b border-gray-50 px-5 py-4">
            <div>
              <h2 className="text-sm font-bold text-gray-900">Contas manuais</h2>
              <p className="text-xs text-gray-400">Dinheiro em espécie, poupança e outras contas</p>
            </div>
            <button
              onClick={() => setShowAddAccount(true)}
              className="flex h-8 w-8 items-center justify-center rounded-full bg-indigo-50 text-indigo-600 hover:bg-indigo-100"
            >
              <Plus className="h-4 w-4" />
            </button>
          </div>

          {accounts.filter(a => a.active !== false).length === 0 ? (
            <div className="py-10 text-center">
              <Wallet className="mx-auto mb-2 h-8 w-8 text-gray-300" />
              <p className="text-sm text-gray-400">Nenhuma conta ainda</p>
              <p className="mt-1 text-xs text-gray-300">Clique no + para adicionar</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-50">
              {accounts.filter(a => a.active !== false).map((acc) => (
                <div key={acc.id} className="group flex items-center gap-3 px-5 py-4">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-indigo-50">
                    <Wallet className="h-4 w-4 text-indigo-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-900">{acc.name}</p>
                    <p className="text-xs text-gray-400">
                      {ACCOUNT_TYPES.find(t => t.value === acc.type)?.label ?? acc.type}
                    </p>
                  </div>
                  <span className="text-sm font-bold tabular-nums text-gray-900">{brl(acc.balanceCents)}</span>
                  <button
                    onClick={() => void removeAccount(acc.id, acc.name)}
                    className="hidden h-7 w-7 shrink-0 items-center justify-center rounded-lg text-gray-300 hover:bg-red-50 hover:text-red-400 group-hover:flex"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Formulário inline adicionar conta */}
          {showAddAccount && (
            <form onSubmit={saveAccount} className="border-t border-gray-100 bg-gray-50 p-5 space-y-3">
              <p className="text-xs font-bold uppercase tracking-wider text-gray-500">Nova conta</p>
              <input
                required
                placeholder="Nome da conta (ex: Nubank, Caixa...)"
                value={accName}
                onChange={e => setAccName(e.target.value)}
                className="w-full rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm outline-none focus:border-indigo-400"
              />
              <select
                value={accType}
                onChange={e => setAccType(e.target.value)}
                className="w-full rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm outline-none focus:border-indigo-400"
              >
                {ACCOUNT_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
              <input
                placeholder="Saldo atual (ex: 1500,00)"
                value={accBalance}
                onChange={e => setAccBalance(e.target.value)}
                inputMode="decimal"
                className="w-full rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm outline-none focus:border-indigo-400"
              />
              <div className="flex gap-2">
                <button type="button" onClick={() => setShowAddAccount(false)}
                  className="flex-1 rounded-xl border border-gray-200 py-2.5 text-sm font-semibold text-gray-500">
                  Cancelar
                </button>
                <button type="submit" disabled={savingAcc}
                  className="flex-1 rounded-xl bg-indigo-600 py-2.5 text-sm font-bold text-white hover:bg-indigo-700 disabled:opacity-50">
                  {savingAcc ? 'Salvando...' : 'Salvar'}
                </button>
              </div>
            </form>
          )}
        </div>

        {/* ─── CARTÕES DE CRÉDITO ──────────────────────────────────── */}
        <div className="rounded-2xl bg-white overflow-hidden" style={{ border: '1px solid #e5e7eb' }}>
          <div className="flex items-center justify-between border-b border-gray-50 px-5 py-4">
            <div>
              <h2 className="text-sm font-bold text-gray-900">Cartões de crédito</h2>
              <p className="text-xs text-gray-400">Acompanhe quanto de limite você ainda tem</p>
            </div>
            <button
              onClick={() => setShowAddCard(true)}
              className="flex h-8 w-8 items-center justify-center rounded-full bg-indigo-50 text-indigo-600 hover:bg-indigo-100"
            >
              <Plus className="h-4 w-4" />
            </button>
          </div>

          {cards.length === 0 ? (
            <div className="py-10 text-center">
              <CreditCard className="mx-auto mb-2 h-8 w-8 text-gray-300" />
              <p className="text-sm text-gray-400">Nenhum cartão ainda</p>
              <p className="mt-1 text-xs text-gray-300">Clique no + para adicionar</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-50">
              {cards.map((card) => {
                const pct = card.limitCents > 0 ? Math.min(100, Math.round((card.limitCents / card.limitCents) * 0)) : 0;
                const available = card.limitCents;
                return (
                  <div key={card.id} className="px-5 py-4">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-purple-50">
                          <CreditCard className="h-4 w-4 text-purple-500" />
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-gray-900">{card.name}</p>
                          <p className="text-xs text-gray-400">Limite: {brl(card.limitCents)}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-bold text-gray-900 tabular-nums">{brl(available)} disponível</p>
                      </div>
                    </div>
                    <div className="h-2 w-full overflow-hidden rounded-full bg-gray-100">
                      <div className="h-full rounded-full bg-purple-400" style={{ width: `${pct}%` }} />
                    </div>
                    <p className="mt-1 text-xs text-gray-400">
                      {card.closingDay ? `Fecha dia ${card.closingDay}` : ''}{card.closingDay && card.dueDay ? ' · ' : ''}{card.dueDay ? `Vence dia ${card.dueDay}` : ''}
                    </p>
                  </div>
                );
              })}
            </div>
          )}

          {showAddCard && (
            <form onSubmit={saveCard} className="border-t border-gray-100 bg-gray-50 p-5 space-y-3">
              <p className="text-xs font-bold uppercase tracking-wider text-gray-500">Novo cartão</p>
              <input
                required
                placeholder="Nome do cartão (ex: Nubank Roxinho...)"
                value={cardName}
                onChange={e => setCardName(e.target.value)}
                className="w-full rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm outline-none focus:border-indigo-400"
              />
              <input
                placeholder="Limite do cartão (ex: 5000,00)"
                value={cardLimit}
                onChange={e => setCardLimit(e.target.value)}
                inputMode="decimal"
                className="w-full rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm outline-none focus:border-indigo-400"
              />
              <div className="flex gap-2">
                <button type="button" onClick={() => setShowAddCard(false)}
                  className="flex-1 rounded-xl border border-gray-200 py-2.5 text-sm font-semibold text-gray-500">
                  Cancelar
                </button>
                <button type="submit" disabled={savingCard}
                  className="flex-1 rounded-xl bg-indigo-600 py-2.5 text-sm font-bold text-white hover:bg-indigo-700 disabled:opacity-50">
                  {savingCard ? 'Salvando...' : 'Salvar'}
                </button>
              </div>
            </form>
          )}
        </div>

        <div className="h-20" />
      </div>

      {/* Modal de ajuda Pluggy */}
      {showPluggyHelp && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="font-bold text-gray-900">Como funciona a conexão?</h3>
              <button onClick={() => setShowPluggyHelp(false)} className="text-gray-400 hover:text-gray-600">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="space-y-3 text-sm text-gray-600">
              <p>🔒 <strong>É 100% seguro.</strong> Usamos o Open Finance, sistema oficial do Banco Central do Brasil.</p>
              <p>👁️ <strong>Só leitura.</strong> O sistema não consegue fazer transferências ou pagamentos, apenas lê seus dados.</p>
              <p>🏦 <strong>Funciona com 100+ bancos</strong> como Nubank, Itaú, Bradesco, Santander, Caixa, BB e outros.</p>
              <p>🔄 <strong>Atualização automática</strong> a cada 6 horas para você sempre ver o saldo correto.</p>
            </div>
            <button
              onClick={() => { setShowPluggyHelp(false); void handleConnectBank(); }}
              className="mt-5 w-full rounded-xl bg-indigo-600 py-3 text-sm font-bold text-white hover:bg-indigo-700"
            >
              Entendi, conectar meu banco
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
