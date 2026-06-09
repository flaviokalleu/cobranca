'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Banknote, ClipboardList, Package, Search, Truck, Users } from 'lucide-react';
import { useAppSelector } from '@/store/hooks';
import { api } from '@/lib/http-client';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { navSections } from './nav';

interface SearchResult {
  customers: Array<{ id: string; name: string; phone?: string | null; document?: string | null }>;
  charges: Array<{ id: string; description: string; amountCents: number; status: string; customer?: { name: string } }>;
  tasks: Array<{ id: string; title: string; done: boolean; dueDate?: string | null }>;
  products: Array<{ id: string; name: string; sku?: string | null; stockQty: number }>;
  suppliers: Array<{ id: string; name: string; phone?: string | null; document?: string | null }>;
}

export function GlobalSearch() {
  const router = useRouter();
  const role = useAppSelector((state) => state.auth.role);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult | null>(null);

  const items = useMemo(() => {
    const text = query.trim().toLowerCase();
    return navSections
      .flatMap((section) => section.items)
      .filter((item) => !item.adminOnly || role === 'ADMIN' || role === 'SUPERADMIN')
      .filter((item) => !text || item.label.toLowerCase().includes(text) || item.href.includes(text));
  }, [query, role]);

  useEffect(() => {
    const text = query.trim();
    if (text.length < 2) {
      setResults(null);
      return;
    }
    const timeout = window.setTimeout(() => {
      void api<SearchResult>('GET', `/search?q=${encodeURIComponent(text)}`).then((res) => {
        if (res.status < 400) setResults(res.data);
      });
    }, 250);
    return () => window.clearTimeout(timeout);
  }, [query]);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        setOpen((value) => !value);
      }
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  function goTo(href: string) {
    setOpen(false);
    setQuery('');
    setResults(null);
    router.push(href);
  }

  const entityItems = useMemo(() => {
    if (!results) return [];
    return [
      ...results.customers.map((item) => ({
        key: `customer-${item.id}`,
        label: item.name,
        detail: item.phone ?? item.document ?? 'Cliente',
        href: `/dashboard/clientes/${item.id}`,
        icon: Users,
      })),
      ...results.charges.map((item) => ({
        key: `charge-${item.id}`,
        label: item.description,
        detail: `${item.customer?.name ?? 'Cobranca'} | ${item.status}`,
        href: `/dashboard/cobrancas/${item.id}`,
        icon: Banknote,
      })),
      ...results.tasks.map((item) => ({
        key: `task-${item.id}`,
        label: item.title,
        detail: item.done ? 'Tarefa concluida' : 'Tarefa aberta',
        href: '/dashboard/tarefas',
        icon: ClipboardList,
      })),
      ...results.products.map((item) => ({
        key: `product-${item.id}`,
        label: item.name,
        detail: item.sku ?? `Estoque ${item.stockQty}`,
        href: '/dashboard/produtos',
        icon: Package,
      })),
      ...results.suppliers.map((item) => ({
        key: `supplier-${item.id}`,
        label: item.name,
        detail: item.phone ?? item.document ?? 'Fornecedor',
        href: '/dashboard/fornecedores',
        icon: Truck,
      })),
    ];
  }, [results]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-w-xl p-0">
        <DialogTitle className="sr-only">Busca global</DialogTitle>
        <div className="flex items-center gap-2 border-b px-4 py-3">
          <Search className="h-4 w-4 text-muted-foreground" />
          <input
            autoFocus
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Buscar tela, cliente, cobranca ou tarefa"
            className="h-9 flex-1 bg-transparent text-sm outline-none"
          />
          <span className="rounded border px-1.5 py-0.5 text-[10px] font-semibold text-muted-foreground">
            Ctrl K
          </span>
        </div>
        <div className="max-h-80 overflow-y-auto p-2">
          {entityItems.map((item) => (
            <button
              key={item.key}
              onClick={() => goTo(item.href)}
              className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-left text-sm hover:bg-muted"
            >
              <item.icon className="h-4 w-4 text-muted-foreground" />
              <span className="min-w-0 flex-1">
                <span className="block truncate font-medium">{item.label}</span>
                <span className="block truncate text-xs text-muted-foreground">{item.detail}</span>
              </span>
            </button>
          ))}
          {entityItems.length > 0 && items.length > 0 && <div className="my-1 border-t" />}
          {items.map((item) => (
            <button
              key={item.href}
              onClick={() => goTo(item.href)}
              className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-left text-sm hover:bg-muted"
            >
              <item.icon className="h-4 w-4 text-muted-foreground" />
              <span className="font-medium">{item.label}</span>
            </button>
          ))}
          {items.length === 0 && entityItems.length === 0 && (
            <div className="px-3 py-10 text-center text-sm text-muted-foreground">
              Nenhuma tela encontrada.
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
