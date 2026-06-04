'use client';

import { useEffect } from 'react';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { fetchAudit } from '@/store/dataSlice';
import { PageHeader } from '@/components/page-header';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

const fmtDateTime = (iso: string) => new Date(iso).toLocaleString('pt-BR');

export default function AtividadePage() {
  const dispatch = useAppDispatch();
  const role = useAppSelector((s) => s.auth.role);
  const audit = useAppSelector((s) => s.data.audit);

  useEffect(() => {
    if (role === 'ADMIN') void dispatch(fetchAudit());
  }, [role, dispatch]);

  if (role !== 'ADMIN') {
    return (
      <>
        <PageHeader title="Atividade" />
        <div className="p-6">
          <Card className="p-6 text-sm text-muted-foreground">
            Acesso restrito a administradores.
          </Card>
        </div>
      </>
    );
  }

  return (
    <>
      <PageHeader title="Atividade" description={`${audit.length} eventos recentes`} />
      <div className="p-6">
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
              {audit.map((a) => (
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
              {audit.length === 0 && (
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
