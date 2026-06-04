'use client';

import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import {
  createCustomerDocument,
  createRequirement,
  fetchCustomerDocuments,
  fetchRequirements,
  updateCustomerDocumentStatus,
} from '@/store/documentsSlice';
import { PageHeader } from '@/components/page-header';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { FilePlus, Plus } from 'lucide-react';

const statusLabel: Record<string, string> = {
  NOT_SENT: 'Nao enviado',
  SENT: 'Enviado',
  IN_REVIEW: 'Em analise',
  APPROVED: 'Aprovado',
  REJECTED: 'Rejeitado',
};

const statusVariant = (status: string) => {
  if (status === 'APPROVED') return 'success' as const;
  if (status === 'REJECTED') return 'destructive' as const;
  if (status === 'SENT' || status === 'IN_REVIEW') return 'warning' as const;
  return 'secondary' as const;
};

export default function DocumentosPage() {
  const dispatch = useAppDispatch();
  const customers = useAppSelector((state) => state.data.customers);
  const { requirements, customerDocuments } = useAppSelector((state) => state.documents);

  const [customerId, setCustomerId] = useState('');
  const [requirementOpen, setRequirementOpen] = useState(false);
  const [documentOpen, setDocumentOpen] = useState(false);
  const [requirementName, setRequirementName] = useState('');
  const [requirementCategory, setRequirementCategory] = useState('Minha Casa Minha Vida');
  const [documentName, setDocumentName] = useState('');
  const [fileUrl, setFileUrl] = useState('');
  const [notes, setNotes] = useState('');

  useEffect(() => {
    void dispatch(fetchRequirements());
  }, [dispatch]);

  useEffect(() => {
    if (!customerId && customers[0]) setCustomerId(customers[0].id);
  }, [customers, customerId]);

  useEffect(() => {
    if (customerId) void dispatch(fetchCustomerDocuments(customerId));
  }, [dispatch, customerId]);

  const stats = useMemo(() => {
    const approved = customerDocuments.filter((doc) => doc.status === 'APPROVED').length;
    return {
      approved,
      pending: customerDocuments.length - approved,
    };
  }, [customerDocuments]);

  async function onCreateRequirement(e: React.FormEvent) {
    e.preventDefault();
    const res = await dispatch(
      createRequirement({ name: requirementName, category: requirementCategory }),
    );
    if (createRequirement.fulfilled.match(res)) {
      toast.success('Requisito criado');
      setRequirementName('');
      setRequirementOpen(false);
      if (customerId) void dispatch(fetchCustomerDocuments(customerId));
    }
  }

  async function onCreateDocument(e: React.FormEvent) {
    e.preventDefault();
    if (!customerId) return;
    const res = await dispatch(
      createCustomerDocument({
        customerId,
        name: documentName,
        status: fileUrl ? 'SENT' : 'NOT_SENT',
        fileUrl: fileUrl || undefined,
        notes: notes || undefined,
      }),
    );
    if (createCustomerDocument.fulfilled.match(res)) {
      toast.success('Documento criado');
      setDocumentName('');
      setFileUrl('');
      setNotes('');
      setDocumentOpen(false);
    }
  }

  return (
    <>
      <PageHeader
        title="Documentos"
        description={`${requirements.length} requisito(s), ${stats.pending} pendencia(s)`}
        actions={
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setRequirementOpen(true)}>
              <FilePlus className="h-4 w-4" />
              Requisito
            </Button>
            <Button onClick={() => setDocumentOpen(true)} disabled={!customerId}>
              <Plus className="h-4 w-4" />
              Documento
            </Button>
          </div>
        }
      />

      <div className="space-y-4 p-6">
        <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_160px_160px]">
          <div className="grid gap-1.5">
            <Label>Cliente</Label>
            <Select value={customerId} onValueChange={setCustomerId}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione um cliente" />
              </SelectTrigger>
              <SelectContent>
                {customers.map((customer) => (
                  <SelectItem key={customer.id} value={customer.id}>
                    {customer.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="rounded-md border bg-card p-3">
            <p className="text-xs text-muted-foreground">Aprovados</p>
            <p className="text-2xl font-semibold">{stats.approved}</p>
          </div>
          <div className="rounded-md border bg-card p-3">
            <p className="text-xs text-muted-foreground">Pendentes</p>
            <p className="text-2xl font-semibold">{stats.pending}</p>
          </div>
        </div>

        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Documento</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Arquivo</TableHead>
                <TableHead>Observacoes</TableHead>
                <TableHead className="text-right">Atualizar</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {customerDocuments.map((document) => (
                <TableRow key={document.id}>
                  <TableCell className="font-medium">{document.name}</TableCell>
                  <TableCell>
                    <Badge variant={statusVariant(document.status)}>
                      {statusLabel[document.status] ?? document.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="max-w-[220px] truncate">
                    {document.fileUrl ? (
                      <a
                        className="text-primary hover:underline"
                        href={document.fileUrl}
                        target="_blank"
                        rel="noreferrer"
                      >
                        {document.fileName ?? document.fileUrl}
                      </a>
                    ) : (
                      <span className="text-muted-foreground">Sem arquivo</span>
                    )}
                  </TableCell>
                  <TableCell className="max-w-[260px] truncate text-muted-foreground">
                    {document.notes ?? '-'}
                  </TableCell>
                  <TableCell>
                    <div className="flex justify-end">
                      <Select
                        value={document.status}
                        onValueChange={(status) =>
                          dispatch(
                            updateCustomerDocumentStatus({
                              id: document.id,
                              customerId: document.customerId,
                              status,
                            }),
                          )
                        }
                      >
                        <SelectTrigger className="w-36">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {Object.entries(statusLabel).map(([key, label]) => (
                            <SelectItem key={key} value={key}>
                              {label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {customerDocuments.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="py-12 text-center text-muted-foreground">
                    Selecione um cliente para carregar a pasta digital.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </Card>
      </div>

      <Dialog open={requirementOpen} onOpenChange={setRequirementOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Novo requisito documental</DialogTitle>
            <DialogDescription>Esse item entra no checklist dos clientes.</DialogDescription>
          </DialogHeader>
          <form onSubmit={onCreateRequirement} className="grid gap-4">
            <div className="grid gap-1.5">
              <Label>Nome</Label>
              <Input
                value={requirementName}
                onChange={(event) => setRequirementName(event.target.value)}
                required
              />
            </div>
            <div className="grid gap-1.5">
              <Label>Categoria</Label>
              <Input
                value={requirementCategory}
                onChange={(event) => setRequirementCategory(event.target.value)}
              />
            </div>
            <Button type="submit">Salvar requisito</Button>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={documentOpen} onOpenChange={setDocumentOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Novo documento avulso</DialogTitle>
            <DialogDescription>Registre um documento fora do checklist padrao.</DialogDescription>
          </DialogHeader>
          <form onSubmit={onCreateDocument} className="grid gap-4">
            <div className="grid gap-1.5">
              <Label>Nome</Label>
              <Input
                value={documentName}
                onChange={(event) => setDocumentName(event.target.value)}
                required
              />
            </div>
            <div className="grid gap-1.5">
              <Label>URL do arquivo</Label>
              <Input value={fileUrl} onChange={(event) => setFileUrl(event.target.value)} />
            </div>
            <div className="grid gap-1.5">
              <Label>Observacoes</Label>
              <Input value={notes} onChange={(event) => setNotes(event.target.value)} />
            </div>
            <Button type="submit">Salvar documento</Button>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
