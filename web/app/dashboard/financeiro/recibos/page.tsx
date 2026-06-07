'use client';

import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { CheckCircle2, FileUp, RefreshCw, Trash2 } from 'lucide-react';
import { API_URL, api, getToken } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

interface FinancialEntry {
  id: string;
  tipo: string;
  descricao: string;
  valorCents: number;
  confianca: string;
  arquivoUrl?: string | null;
  dataTransacao?: string | null;
  pagadorNome?: string | null;
  recebedorNome?: string | null;
  status: string;
  createdAt: string;
}

interface Paginated<T> {
  data: T[];
}

const brl = (cents: number) =>
  (cents / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

export default function RecibosPage() {
  const [file, setFile] = useState<File | null>(null);
  const [tipo, setTipo] = useState('gasto');
  const [loading, setLoading] = useState(false);
  const [entries, setEntries] = useState<FinancialEntry[]>([]);

  const total = useMemo(() => entries.reduce((sum, item) => sum + item.valorCents, 0), [entries]);

  async function load() {
    const res = await api<Paginated<FinancialEntry>>('GET', '/financial-entries?status=pending_confirmation&limit=50');
    if (res.status < 400) setEntries(res.data.data ?? []);
  }

  useEffect(() => {
    void load();
  }, []);

  async function upload(event: React.FormEvent) {
    event.preventDefault();
    if (!file) return;
    setLoading(true);
    const form = new FormData();
    form.append('file', file);
    form.append('tipo', tipo);
    const token = getToken();
    const response = await fetch(`${API_URL}/financial-extractor/receipt`, {
      method: 'POST',
      headers: token ? { authorization: `Bearer ${token}` } : {},
      body: form,
    });
    setLoading(false);
    if (!response.ok) {
      toast.error('Nao foi possivel processar o recibo');
      return;
    }
    setFile(null);
    toast.success('Recibo analisado e enviado para revisao');
    await load();
  }

  async function confirm(entry: FinancialEntry) {
    const res = await api('PATCH', `/financial-entries/${entry.id}`, { status: 'saved' });
    if (res.status < 400) {
      toast.success('Lancamento confirmado');
      await load();
    } else {
      toast.error('Erro ao confirmar lancamento');
    }
  }

  async function cancel(entry: FinancialEntry) {
    const res = await api('PATCH', `/financial-entries/${entry.id}`, { status: 'cancelled' });
    if (res.status < 400) {
      toast.success('Recibo cancelado');
      await load();
    } else {
      toast.error('Erro ao cancelar recibo');
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="border-b bg-card px-4 py-4 sm:px-6">
        <h1 className="text-base font-bold">Recibos</h1>
        <p className="text-xs text-muted-foreground">Upload OCR, revisao e confirmacao de comprovantes.</p>
      </div>

      <div className="grid gap-4 p-4 sm:p-6 lg:grid-cols-[360px_1fr]">
        <Card className="p-4">
          <form onSubmit={upload} className="space-y-4">
            <div className="space-y-1.5">
              <Label>Arquivo</Label>
              <Input
                type="file"
                accept="image/*,.pdf"
                onChange={(event) => setFile(event.target.files?.[0] ?? null)}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Tipo esperado</Label>
              <select
                value={tipo}
                onChange={(event) => setTipo(event.target.value)}
                className="h-10 w-full rounded-md border bg-background px-3 text-sm"
              >
                <option value="gasto">Saida</option>
                <option value="receita">Entrada</option>
              </select>
            </div>
            <Button type="submit" disabled={!file || loading} className="w-full">
              {loading ? <RefreshCw className="h-4 w-4 animate-spin" /> : <FileUp className="h-4 w-4" />}
              Enviar para OCR
            </Button>
          </form>
          <div className="mt-4 rounded-md bg-muted p-3 text-xs text-muted-foreground">
            Pendentes: <strong>{entries.length}</strong> | Valor em revisao: <strong>{brl(total)}</strong>
          </div>
        </Card>

        <Card className="overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Descricao</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Valor</TableHead>
                <TableHead>Confianca</TableHead>
                <TableHead>Origem</TableHead>
                <TableHead className="text-right">Acoes</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {entries.map((entry) => (
                <TableRow key={entry.id}>
                  <TableCell>
                    <div className="font-medium">{entry.descricao}</div>
                    <div className="text-xs text-muted-foreground">
                      {entry.pagadorNome ?? entry.recebedorNome ?? 'Sem identificacao'}
                    </div>
                  </TableCell>
                  <TableCell>{entry.tipo === 'receita' ? 'Entrada' : 'Saida'}</TableCell>
                  <TableCell>{brl(entry.valorCents)}</TableCell>
                  <TableCell>{entry.confianca}</TableCell>
                  <TableCell>{entry.arquivoUrl ?? '-'}</TableCell>
                  <TableCell>
                    <div className="flex justify-end gap-1">
                      <Button size="icon" variant="ghost" title="Confirmar" onClick={() => void confirm(entry)}>
                        <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                      </Button>
                      <Button size="icon" variant="ghost" title="Cancelar" onClick={() => void cancel(entry)}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {entries.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="py-12 text-center text-sm text-muted-foreground">
                    Nenhum recibo pendente de revisao.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </Card>
      </div>
    </div>
  );
}
