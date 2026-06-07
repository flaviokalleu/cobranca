'use client';

import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { fetchCustomers } from '@/store/dataSlice';
import {
  createCustomerDocument,
  createRequirement,
  deleteCustomerDocument,
  deleteRequirement,
  fetchCustomerDocuments,
  fetchRequirements,
  type CustomerDocument,
  type DocumentRequirement,
  updateCustomerDocument,
  updateCustomerDocumentStatus,
  updateRequirement,
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
import { FilePlus, Pencil, Plus, Trash2 } from 'lucide-react';

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
  const [editingRequirementId, setEditingRequirementId] = useState<string | null>(null);
  const [editingDocumentId, setEditingDocumentId] = useState<string | null>(null);
  const [requirementName, setRequirementName] = useState('');
  const [requirementCategory, setRequirementCategory] = useState('Minha Casa Minha Vida');
  const [requirementDescription, setRequirementDescription] = useState('');
  const [documentName, setDocumentName] = useState('');
  const [documentStatus, setDocumentStatus] = useState('NOT_SENT');
  const [fileUrl, setFileUrl] = useState('');
  const [notes, setNotes] = useState('');

  useEffect(() => {
    void dispatch(fetchCustomers());
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
    return { approved, pending: customerDocuments.length - approved };
  }, [customerDocuments]);

  function resetRequirement() {
    setEditingRequirementId(null);
    setRequirementName('');
    setRequirementCategory('Minha Casa Minha Vida');
    setRequirementDescription('');
  }

  function resetDocument() {
    setEditingDocumentId(null);
    setDocumentName('');
    setDocumentStatus('NOT_SENT');
    setFileUrl('');
    setNotes('');
  }

  function openRequirementCreate() {
    resetRequirement();
    setRequirementOpen(true);
  }

  function openRequirementEdit(requirement: DocumentRequirement) {
    setEditingRequirementId(requirement.id);
    setRequirementName(requirement.name);
    setRequirementCategory(requirement.category);
    setRequirementDescription(requirement.description ?? '');
    setRequirementOpen(true);
  }

  function openDocumentCreate() {
    resetDocument();
    setDocumentOpen(true);
  }

  function openDocumentEdit(document: CustomerDocument) {
    setEditingDocumentId(document.id);
    setDocumentName(document.name);
    setDocumentStatus(document.status);
    setFileUrl(document.fileUrl ?? '');
    setNotes(document.notes ?? '');
    setDocumentOpen(true);
  }

  async function onSubmitRequirement(e: React.FormEvent) {
    e.preventDefault();
    const payload = {
      name: requirementName,
      category: requirementCategory,
      description: requirementDescription || null,
    };
    const res = editingRequirementId
      ? await dispatch(updateRequirement({ id: editingRequirementId, ...payload }))
      : await dispatch(
          createRequirement({
            name: payload.name,
            category: payload.category,
            description: payload.description ?? undefined,
          }),
        );
    const ok = editingRequirementId
      ? updateRequirement.fulfilled.match(res)
      : createRequirement.fulfilled.match(res);
    if (ok) {
      toast.success(editingRequirementId ? 'Requisito atualizado' : 'Requisito criado');
      resetRequirement();
      setRequirementOpen(false);
      if (customerId) void dispatch(fetchCustomerDocuments(customerId));
    } else {
      toast.error(typeof res.payload === 'string' ? res.payload : 'Erro');
    }
  }

  async function onSubmitDocument(e: React.FormEvent) {
    e.preventDefault();
    if (!customerId) return;
    const payload = {
      customerId,
      name: documentName,
      status: documentStatus,
      fileUrl: fileUrl || null,
      notes: notes || null,
    };
    const res = editingDocumentId
      ? await dispatch(updateCustomerDocument({ id: editingDocumentId, ...payload }))
      : await dispatch(
          createCustomerDocument({
            customerId,
            name: payload.name,
            status: fileUrl ? 'SENT' : payload.status,
            fileUrl: fileUrl || undefined,
            notes: notes || undefined,
          }),
        );
    const ok = editingDocumentId
      ? updateCustomerDocument.fulfilled.match(res)
      : createCustomerDocument.fulfilled.match(res);
    if (ok) {
      toast.success(editingDocumentId ? 'Documento atualizado' : 'Documento criado');
      resetDocument();
      setDocumentOpen(false);
    } else {
      toast.error(typeof res.payload === 'string' ? res.payload : 'Erro');
    }
  }

  async function onDeleteRequirement(requirement: DocumentRequirement) {
    if (!window.confirm(`Excluir requisito "${requirement.name}"?`)) return;
    const res = await dispatch(deleteRequirement(requirement.id));
    if (deleteRequirement.fulfilled.match(res)) {
      toast.success('Requisito excluido');
      if (customerId) void dispatch(fetchCustomerDocuments(customerId));
    } else {
      toast.error(typeof res.payload === 'string' ? res.payload : 'Erro');
    }
  }

  async function onDeleteDocument(document: CustomerDocument) {
    if (!window.confirm(`Excluir documento "${document.name}"?`)) return;
    const res = await dispatch(deleteCustomerDocument({ id: document.id, customerId }));
    if (deleteCustomerDocument.fulfilled.match(res)) toast.success('Documento excluido');
    else toast.error(typeof res.payload === 'string' ? res.payload : 'Erro');
  }

  return (
    <>
      <PageHeader
        title="Documentos"
        description={`${requirements.length} requisito(s), ${stats.pending} pendencia(s)`}
        actions={
          <div className="flex gap-2">
            <Button variant="outline" onClick={openRequirementCreate}>
              <FilePlus className="h-4 w-4" />
              Requisito
            </Button>
            <Button onClick={openDocumentCreate} disabled={!customerId}>
              <Plus className="h-4 w-4" />
              Documento
            </Button>
          </div>
        }
      />

      <div className="space-y-4 p-4 md:p-6">
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
                <TableHead>Requisito</TableHead>
                <TableHead>Categoria</TableHead>
                <TableHead>Descricao</TableHead>
                <TableHead className="w-[96px] text-right">Acoes</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {requirements.map((requirement) => (
                <TableRow key={requirement.id}>
                  <TableCell className="font-medium">{requirement.name}</TableCell>
                  <TableCell>{requirement.category}</TableCell>
                  <TableCell className="max-w-[360px] truncate text-muted-foreground">
                    {requirement.description ?? '-'}
                  </TableCell>
                  <TableCell>
                    <div className="flex justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        title="Editar"
                        onClick={() => openRequirementEdit(requirement)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        title="Excluir"
                        onClick={() => void onDeleteRequirement(requirement)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {requirements.length === 0 && (
                <TableRow>
                  <TableCell colSpan={4} className="py-8 text-center text-muted-foreground">
                    Nenhum requisito cadastrado.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </Card>

        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Documento</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Arquivo</TableHead>
                <TableHead>Observacoes</TableHead>
                <TableHead className="w-[220px] text-right">Acoes</TableHead>
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
                    <div className="flex justify-end gap-1">
                      <Select
                        value={document.status}
                        onValueChange={(status) =>
                          void dispatch(
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
                      <Button
                        variant="ghost"
                        size="icon"
                        title="Editar"
                        onClick={() => openDocumentEdit(document)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        title="Excluir"
                        onClick={() => void onDeleteDocument(document)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
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
            <DialogTitle>
              {editingRequirementId ? 'Editar requisito documental' : 'Novo requisito documental'}
            </DialogTitle>
            <DialogDescription>Esse item entra no checklist dos clientes.</DialogDescription>
          </DialogHeader>
          <form onSubmit={onSubmitRequirement} className="grid gap-4">
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
            <div className="grid gap-1.5">
              <Label>Descricao</Label>
              <Input
                value={requirementDescription}
                onChange={(event) => setRequirementDescription(event.target.value)}
              />
            </div>
            <Button type="submit">
              {editingRequirementId ? 'Salvar alteracoes' : 'Salvar requisito'}
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={documentOpen} onOpenChange={setDocumentOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingDocumentId ? 'Editar documento' : 'Novo documento avulso'}
            </DialogTitle>
            <DialogDescription>Registre um documento fora do checklist padrao.</DialogDescription>
          </DialogHeader>
          <form onSubmit={onSubmitDocument} className="grid gap-4">
            <div className="grid gap-1.5">
              <Label>Nome</Label>
              <Input
                value={documentName}
                onChange={(event) => setDocumentName(event.target.value)}
                required
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-1.5">
                <Label>Status</Label>
                <Select value={documentStatus} onValueChange={setDocumentStatus}>
                  <SelectTrigger>
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
              <div className="grid gap-1.5">
                <Label>URL do arquivo</Label>
                <Input value={fileUrl} onChange={(event) => setFileUrl(event.target.value)} />
              </div>
            </div>
            <div className="grid gap-1.5">
              <Label>Observacoes</Label>
              <Input value={notes} onChange={(event) => setNotes(event.target.value)} />
            </div>
            <Button type="submit">
              {editingDocumentId ? 'Salvar alteracoes' : 'Salvar documento'}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
