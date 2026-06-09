�'use client';

import { useEffect, useMemo, useState } from 'react';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { fetchAudit } from '@/store/dataSlice';
import { PageHeader } from '@/components/page-header';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

const fmtDateTime = (iso: string) => new Date(iso).toLocaleString('pt-BR');

export default function HistoricoPage() {
  const dispatch = useAppDispatch();
  const role = useAppSelector((s) => s.auth.role);
  const audit = useAppSelector((s) => s.data.audit);
  const [query, setQuery] = useState('');
  const [entityFilter, setEntityFilter] = useState('ALL');

  useEffect(() => {
    if (role === 'ADMIN') void dispatch(fetchAudit());
  }, [role, dispatch]);

  const entityOptions = useMemo(
    () => Array.from(new Set(audit.map((entry) => entry.entityType))).sort(),
    [audit],
  );
  const filteredAudit = useMemo(() => {
    const text = query.trim().toLowerCase();
    return audit.filter((entry) => {
      const entityOk = entityFilter === 'ALL' || entry.entityType === entityFilter;
      const textOk =
        !text ||
        entry.action.toLowerCase().includes(text) ||
        entry.entityType.toLowerCase().includes(text) ||
        entry.actor.toLowerCase().includes(text);
      return entityOk && textOk;
    });
  }, [audit, entityFilter, query]);

  if (role !== 'ADMIN') {
    return (
      <>
        <PageHeader title="Historico" />
        <div className="p-4 md:p-6">
          <Card className="p-4 md:p-6 text-sm text-muted-foreground">
            Acesso restrito a administradores.
          </Card>
        </div>
      </>
    );
  }

  return (
    <>
      <PageHeader title="Historico" description={`${filteredAudit.length} eventos no filtro`} />
      <div className="space-y-4 p-4 md:p-6">
        <Card className="grid gap-3 p-4 md:grid-cols-[1fr_220px]">
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Buscar por acao, tipo ou usuario"
          />
          <select
            value={entityFilter}
            onChange={(event) => setEntityFilter(event.target.value)}
            className="h-10 rounded-md border border-input bg-background px-3 text-sm"
          >
            <option value="ALL">Todos os tipos</option>
            {entityOptions.map((entity) => (
              <option key={entity} value={entity}>
                {entity}
              </option>
            ))}
          </select>
        </Card>
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Quando</TableHead>
                <TableHead>Ação</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Por</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredAudit.map((a) => (
                <TableRow key={a.id}>
                  <TableCell className="whitespace-nowrap text-muted-foreground">
                    {fmtDateTime(a.createdAt)}
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary">{a.action}</Badge>
                  </TableCell>
                  <TableCell>{a.entityType}</TableCell>
                  <TableCell>{a.actor}</TableCell>
                </TableRow>
              ))}
              {filteredAudit.length === 0 && (
                <TableRow>
                  <TableCell colSpan={4} className="py-12 text-center text-muted-foreground">
                    Nenhum evento ainda.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </Card>
      </div>
    </>
  );
}

