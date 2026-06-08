'use client';

import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { CheckCircle2, Pencil, Plus, Power, RefreshCw, Save, X } from 'lucide-react';
import { PageHeader } from '@/components/page-header';
import { api } from '@/lib/api';

type AccountType = 'REVENUE' | 'EXPENSE' | 'ASSET' | 'LIABILITY';

interface AccountPlan {
  code: string;
  name: string;
  type: AccountType;
  active: boolean;
  parentId?: string | null;
}

const emptyForm = { code: '', name: '', type: 'REVENUE' as AccountType };

const typeLabels: Record<AccountType, string> = {
  REVENUE: 'Receita',
  EXPENSE: 'Despesa',
  ASSET: 'Tenho',
  LIABILITY: 'Devo',
};

const typeColors: Record<AccountType, string> = {
  REVENUE: 'bg-emerald-50 text-emerald-700 border-emerald-100',
  EXPENSE: 'bg-rose-50 text-rose-700 border-rose-100',
  ASSET: 'bg-blue-50 text-blue-700 border-blue-100',
  LIABILITY: 'bg-amber-50 text-amber-700 border-amber-100',
};

export default function AccountPlanPage() {
  const [accounts, setAccounts] = useState<AccountPlan[]>([]);
  const [form, setForm] = useState(emptyForm);
  const [editingCode, setEditingCode] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const grouped = useMemo(
    () =>
      accounts.reduce<Record<AccountType, AccountPlan[]>>(
        (acc, account) => {
          acc[account.type].push(account);
          return acc;
        },
        { REVENUE: [], EXPENSE: [], ASSET: [], LIABILITY: [] },
      ),
    [accounts],
  );

  async function load() {
    setLoading(true);
    const res = await api<AccountPlan[]>('GET', '/account-plan');
    setLoading(false);
    if (res.status < 400) {
      setAccounts(res.data);
    } else {
      toast.error('Nao foi possivel carregar as categorias.');
    }
  }

  useEffect(() => {
    void load();
  }, []);

  async function seed() {
    setLoading(true);
    const res = await api<AccountPlan[]>('POST', '/account-plan/seed-default');
    setLoading(false);
    if (res.status < 400) {
      setAccounts(res.data);
      toast.success('Categorias padrao criadas.');
    } else {
      toast.error('Nao foi possivel criar as categorias padrao.');
    }
  }

  function startEdit(account: AccountPlan) {
    setEditingCode(account.code);
    setForm({ code: account.code, name: account.name, type: account.type });
  }

  function cancelEdit() {
    setEditingCode(null);
    setForm(emptyForm);
  }

  async function save() {
    if (!form.code.trim() || !form.name.trim()) {
      toast.error('Informe codigo e nome da categoria.');
      return;
    }

    const originalCode = editingCode;
    const res = originalCode
      ? await api<AccountPlan>('PATCH', `/account-plan/${encodeURIComponent(originalCode)}`, form)
      : await api<AccountPlan>('POST', '/account-plan', form);

    if (res.status < 400) {
      toast.success(originalCode ? 'Categoria atualizada.' : 'Categoria criada.');
      cancelEdit();
      await load();
    } else {
      toast.error('Nao foi possivel salvar a categoria.');
    }
  }

  async function deactivate(code: string) {
    const res = await api<AccountPlan>('DELETE', `/account-plan/${encodeURIComponent(code)}`);
    if (res.status < 400) {
      toast.success('Categoria desativada.');
      await load();
    } else {
      toast.error('Nao foi possivel desativar a categoria.');
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <PageHeader
        title="Categorias financeiras"
        description="Organize entradas e saidas para entender lucro, despesas e saldo."
        actions={
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => void seed()}
              className="inline-flex items-center gap-2 rounded-md border border-border bg-card px-3 py-2 text-sm font-medium text-foreground hover:bg-muted"
            >
              <CheckCircle2 className="h-4 w-4" />
              Criar categorias padrao
            </button>
            <button
              onClick={() => void load()}
              className="inline-flex items-center gap-2 rounded-md border border-border bg-card px-3 py-2 text-sm font-medium text-foreground hover:bg-muted"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              Atualizar
            </button>
          </div>
        }
      />

      <main className="mx-auto grid max-w-7xl gap-6 p-4 lg:grid-cols-[360px_1fr]">
        <section className="rounded-lg border border-border bg-card p-5">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="text-sm font-semibold text-foreground">
                {editingCode ? 'Editar categoria' : 'Nova categoria'}
              </h2>
              <p className="text-xs text-muted-foreground">Use codigos simples como 3.1 para entradas e 4.1 para saidas.</p>
            </div>
            {editingCode && (
              <button
                onClick={cancelEdit}
                className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-border hover:bg-muted"
                title="Cancelar edicao"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          <div className="space-y-4">
            <label className="block">
              <span className="text-xs font-medium text-muted-foreground">Codigo</span>
              <input
                value={form.code}
                onChange={(event) => setForm((current) => ({ ...current, code: event.target.value }))}
                className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
                placeholder="3.1"
              />
            </label>
            <label className="block">
              <span className="text-xs font-medium text-muted-foreground">Nome</span>
              <input
                value={form.name}
                onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
                className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
                placeholder="Receita de servicos"
              />
            </label>
            <label className="block">
              <span className="text-xs font-medium text-muted-foreground">Tipo</span>
              <select
                value={form.type}
                onChange={(event) => setForm((current) => ({ ...current, type: event.target.value as AccountType }))}
                className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
              >
                {Object.entries(typeLabels).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </label>
            <button
              onClick={() => void save()}
              className="inline-flex w-full items-center justify-center gap-2 rounded-md bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground hover:opacity-90"
            >
              {editingCode ? <Save className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
              {editingCode ? 'Salvar alteracoes' : 'Criar categoria'}
            </button>
          </div>
        </section>

        <section className="space-y-5">
          {(Object.keys(typeLabels) as AccountType[]).map((type) => (
            <div key={type} className="rounded-lg border border-border bg-card">
              <div className="flex items-center justify-between border-b border-border px-5 py-4">
                <div>
                  <h2 className="text-sm font-semibold text-foreground">{typeLabels[type]}</h2>
                  <p className="text-xs text-muted-foreground">{grouped[type].length} categorias cadastradas</p>
                </div>
                <span className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${typeColors[type]}`}>
                  {type}
                </span>
              </div>

              <div className="divide-y divide-border">
                {grouped[type].map((account) => (
                  <div key={account.code} className="grid gap-3 px-5 py-4 sm:grid-cols-[90px_1fr_auto] sm:items-center">
                    <div className="font-mono text-sm font-semibold text-foreground">{account.code}</div>
                    <div>
                      <p className="text-sm font-medium text-foreground">{account.name}</p>
                      <p className="text-xs text-muted-foreground">{account.active ? 'Ativa' : 'Inativa'}</p>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => startEdit(account)}
                        className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-border hover:bg-muted"
                        title="Editar"
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => void deactivate(account.code)}
                        className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-border text-rose-600 hover:bg-rose-50"
                        title="Desativar"
                      >
                        <Power className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                ))}
                {grouped[type].length === 0 && (
                  <div className="px-5 py-6 text-sm text-muted-foreground">Nenhuma categoria cadastrada neste grupo.</div>
                )}
              </div>
            </div>
          ))}
        </section>
      </main>
    </div>
  );
}


