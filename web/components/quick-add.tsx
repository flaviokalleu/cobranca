'use client';

import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { createPersonalTransaction } from '@/store/personalFinanceSlice';
import { fetchCategories } from '@/store/categoriesSlice';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Plus, TrendingDown, TrendingUp } from 'lucide-react';

const brlInput = (v: string) => v.replace(/\D/g, '');
const toCents = (v: string) => {
  const digits = brlInput(v).replace(/^0+/, '') || '0';
  return parseInt(digits, 10);
};
const displayBrl = (cents: number) =>
  (cents / 100).toLocaleString('pt-BR', { minimumFractionDigits: 2 });

export function QuickAdd() {
  const dispatch = useAppDispatch();
  const { items: allCategories, seeded } = useAppSelector((s) => s.categories);

  const [open, setOpen] = useState(false);
  const [type, setType] = useState<'EXPENSE' | 'INCOME'>('EXPENSE');
  const [rawValue, setRawValue] = useState('0');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('');
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!seeded) void dispatch(fetchCategories());
  }, [dispatch, seeded]);

  // Tour pode abrir o QuickAdd via evento customizado
  useEffect(() => {
    const handler = () => {
      handleOpen();
      window.dispatchEvent(new CustomEvent('tour:quick-add-opened'));
    };
    window.addEventListener('tour:open-quick-add', handler);
    return () => window.removeEventListener('tour:open-quick-add', handler);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const categories = allCategories.filter((c) =>
    type === 'EXPENSE' ? c.type === 'EXPENSE' : c.type === 'INCOME',
  );

  function handleOpen() {
    setType('EXPENSE');
    setRawValue('0');
    setDescription('');
    setCategory('');
    setDate(new Date().toISOString().slice(0, 10));
    setOpen(true);
  }

  function handleValueKey(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Backspace') {
      setRawValue((v) => (v.length <= 1 ? '0' : v.slice(0, -1)));
      e.preventDefault();
    } else if (/^\d$/.test(e.key)) {
      setRawValue((v) => (v === '0' ? e.key : v + e.key));
      e.preventDefault();
    }
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const cents = toCents(rawValue);
    if (cents < 1) { toast.error('Informe um valor'); return; }
    if (!description.trim()) { toast.error('Informe uma descrição'); return; }

    setLoading(true);
    const res = await dispatch(createPersonalTransaction({
      type,
      amountCents: cents,
      description: description.trim(),
      category: category || undefined,
      occurredAt: new Date(date + 'T12:00:00').toISOString(),
    }));
    setLoading(false);

    if (createPersonalTransaction.fulfilled.match(res)) {
      toast.success(type === 'INCOME' ? 'Entrada registrada! ✓' : 'Saída registrada! ✓');
      setOpen(false);
    } else {
      toast.error(typeof res.payload === 'string' ? res.payload : 'Erro ao registrar');
    }
  }

  const cents = toCents(rawValue);
  const isExpense = type === 'EXPENSE';

  return (
    <>
      {/* Botão flutuante */}
      <button
        data-tour="quick-add"
        onClick={handleOpen}
        title="Registrar lançamento"
        className="fixed bottom-6 right-6 z-50 flex h-14 w-14 items-center justify-center rounded-full shadow-lg transition-transform hover:scale-105 active:scale-95 md:bottom-8 md:right-8"
        style={{ background: 'linear-gradient(135deg, #10b981, #059669)' }}
      >
        <Plus className="h-7 w-7 text-white" strokeWidth={2.5} />
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-sm p-0 overflow-hidden rounded-2xl">
          <DialogHeader className="sr-only">
            <DialogTitle>Novo lançamento</DialogTitle>
          </DialogHeader>

          {/* Toggle entrada / saída */}
          <div className="grid grid-cols-2">
            <button
              type="button"
              onClick={() => { setType('INCOME'); setCategory(''); }}
              className={`flex items-center justify-center gap-2 py-4 text-sm font-bold transition-colors ${
                !isExpense
                  ? 'bg-emerald-500 text-white'
                  : 'bg-gray-100 text-gray-400 hover:bg-gray-200'
              }`}
            >
              <TrendingUp className="h-4 w-4" />
              Entrada
            </button>
            <button
              type="button"
              onClick={() => { setType('EXPENSE'); setCategory(''); }}
              className={`flex items-center justify-center gap-2 py-4 text-sm font-bold transition-colors ${
                isExpense
                  ? 'bg-red-500 text-white'
                  : 'bg-gray-100 text-gray-400 hover:bg-gray-200'
              }`}
            >
              <TrendingDown className="h-4 w-4" />
              Saída
            </button>
          </div>

          <form onSubmit={onSubmit} className="p-5 space-y-4">
            {/* Valor grande */}
            <div
              className={`rounded-2xl p-5 text-center ${isExpense ? 'bg-red-50' : 'bg-emerald-50'}`}
            >
              <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-gray-400">
                Valor
              </p>
              <p
                className={`text-4xl font-bold tabular-nums ${isExpense ? 'text-red-600' : 'text-emerald-600'}`}
              >
                {isExpense ? '-' : '+'} R$ {displayBrl(cents)}
              </p>
              <input
                className="sr-only"
                type="text"
                inputMode="numeric"
                value={rawValue}
                onKeyDown={handleValueKey}
                onChange={() => {}}
                autoFocus
              />
              {/* Teclado numérico visual */}
              <div className="mt-4 grid grid-cols-3 gap-2">
                {['1','2','3','4','5','6','7','8','9','','0','⌫'].map((key) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => {
                      if (key === '⌫') setRawValue((v) => v.length <= 1 ? '0' : v.slice(0, -1));
                      else if (key !== '') setRawValue((v) => v === '0' ? key : v + key);
                    }}
                    className={`rounded-xl py-3 text-lg font-semibold transition-colors ${
                      key === '' ? 'invisible' :
                      key === '⌫' ? 'bg-white text-gray-500 hover:bg-gray-50' :
                      'bg-white text-gray-800 hover:bg-gray-50'
                    } shadow-sm`}
                    disabled={key === ''}
                  >
                    {key}
                  </button>
                ))}
              </div>
            </div>

            {/* Categoria */}
            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-gray-400">Categoria</p>
              <div className="flex flex-wrap gap-2">
                {categories.map((cat) => (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => setCategory(category === cat.name ? '' : cat.name)}
                    className={`flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-all ${
                      category === cat.name
                        ? 'border-transparent text-white shadow-sm'
                        : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300'
                    }`}
                    style={category === cat.name ? { background: cat.color } : {}}
                  >
                    <span
                      className="h-2 w-2 rounded-full flex-shrink-0"
                      style={{ background: cat.color }}
                    />
                    {cat.name}
                  </button>
                ))}
              </div>
            </div>

            {/* Descrição */}
            <div>
              <p className="mb-1.5 text-xs font-semibold uppercase tracking-wider text-gray-400">Descrição</p>
              <input
                type="text"
                placeholder="Ex: Supermercado, Salário..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm text-gray-900 outline-none transition focus:border-gray-400 focus:bg-white"
              />
            </div>

            {/* Data */}
            <div>
              <p className="mb-1.5 text-xs font-semibold uppercase tracking-wider text-gray-400">Data</p>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm text-gray-900 outline-none transition focus:border-gray-400 focus:bg-white"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className={`w-full rounded-xl py-3 text-sm font-bold text-white transition hover:opacity-90 disabled:opacity-50 ${
                isExpense ? 'bg-red-500' : 'bg-emerald-500'
              }`}
            >
              {loading ? 'Salvando...' : isExpense ? 'Registrar saída' : 'Registrar entrada'}
            </button>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
