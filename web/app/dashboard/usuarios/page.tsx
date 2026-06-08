'use client';

import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import {
  createUser,
  deleteUser,
  fetchUsers,
  type User,
  updateUser,
} from '@/store/dataSlice';
import { api } from '@/lib/api';
import { PageHeader } from '@/components/page-header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Copy, MailPlus, Pencil, Trash2, UserPlus, X } from 'lucide-react';

interface Invitation {
  id: string;
  email: string;
  role: string;
  acceptUrl?: string;
  usedAt?: string | null;
  revokedAt?: string | null;
  expiresAt: string;
}

export default function AcessosPage() {
  const dispatch = useAppDispatch();
  const role = useAppSelector((s) => s.auth.role);
  const { users } = useAppSelector((s) => s.data);

  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [newRole, setNewRole] = useState('USER');
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('USER');
  const [invitations, setInvitations] = useState<Invitation[]>([]);

  useEffect(() => {
    if (role === 'ADMIN') {
      void dispatch(fetchUsers());
      void loadInvitations();
    }
  }, [role, dispatch]);

  async function loadInvitations() {
    const res = await api<Invitation[]>('GET', '/invitations');
    if (res.status < 400) setInvitations(res.data);
  }

  function resetForm() {
    setEditingId(null);
    setEmail('');
    setPassword('');
    setNewRole('USER');
  }

  function openCreate() {
    resetForm();
    setOpen(true);
  }

  function openEdit(user: User) {
    setEditingId(user.id);
    setEmail(user.email);
    setPassword('');
    setNewRole(user.role);
    setOpen(true);
  }

  if (role !== 'ADMIN') {
    return (
      <>
        <PageHeader title="Acessos" />
        <div className="p-4 md:p-6">
          <Card className="p-6 text-sm text-muted-foreground">
            Acesso restrito a administradores.
          </Card>
        </div>
      </>
    );
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const res = editingId
      ? await dispatch(
          updateUser({
            id: editingId,
            email,
            role: newRole,
            password: password || undefined,
          }),
        )
      : await dispatch(createUser({ email, password, role: newRole }));
    const ok = editingId ? updateUser.fulfilled.match(res) : createUser.fulfilled.match(res);
    if (ok) {
      toast.success(editingId ? 'Usuario atualizado' : 'Usuario criado');
      resetForm();
      setOpen(false);
    } else {
      toast.error(typeof res.payload === 'string' ? res.payload : 'Erro');
    }
  }

  async function onDelete(user: User) {
    if (!window.confirm(`Excluir usuario "${user.email}"?`)) return;
    const res = await dispatch(deleteUser(user.id));
    if (deleteUser.fulfilled.match(res)) toast.success('Usuario excluido');
    else toast.error(typeof res.payload === 'string' ? res.payload : 'Erro');
  }

  async function createInvitation(event: React.FormEvent) {
    event.preventDefault();
    const res = await api<Invitation>('POST', '/invitations', { email: inviteEmail, role: inviteRole });
    if (res.status < 400) {
      toast.success('Convite enviado');
      setInviteEmail('');
      await loadInvitations();
      if (res.data.acceptUrl) await navigator.clipboard.writeText(res.data.acceptUrl);
    } else {
      toast.error('Nao foi possivel criar convite');
    }
  }

  async function revokeInvitation(invitation: Invitation) {
    const res = await api('DELETE', `/invitations/${invitation.id}`);
    if (res.status < 400) {
      toast.success('Convite revogado');
      await loadInvitations();
    } else {
      toast.error('Nao foi possivel revogar convite');
    }
  }

  return (
    <>
      <PageHeader
        title="Acessos"
        description={`${users.length} ao todo`}
        actions={
          <Button onClick={openCreate}>
            <UserPlus className="h-4 w-4" />
            Novo usuario
          </Button>
        }
      />

      <div className="space-y-4 p-4 md:space-y-6 md:p-6">
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>E-mail</TableHead>
                <TableHead>Papel</TableHead>
                <TableHead className="w-[96px] text-right">Acoes</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map((u) => (
                <TableRow key={u.id}>
                  <TableCell className="font-medium">{u.email}</TableCell>
                  <TableCell>
                    <Badge variant={u.role === 'ADMIN' ? 'default' : 'secondary'}>
                      {u.role}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        title="Editar"
                        onClick={() => openEdit(u)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        title="Excluir"
                        onClick={() => void onDelete(u)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {users.length === 0 && (
                <TableRow>
                  <TableCell colSpan={3} className="py-12 text-center text-muted-foreground">
                    Nenhum usuario ainda.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </Card>

        <div className="grid gap-4 lg:grid-cols-[360px_1fr]">
          <Card className="p-4">
            <form onSubmit={createInvitation} className="space-y-4">
              <div>
                <h2 className="font-semibold">Convites</h2>
                <p className="text-xs text-muted-foreground">Envie acesso com aceite publico e senha propria.</p>
              </div>
              <div className="grid gap-1.5">
                <Label>E-mail</Label>
                <Input type="email" value={inviteEmail} onChange={(event) => setInviteEmail(event.target.value)} required />
              </div>
              <div className="grid gap-1.5">
                <Label>Papel</Label>
                <Select value={inviteRole} onValueChange={setInviteRole}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="USER">Usuario</SelectItem>
                    <SelectItem value="OPERATIONS">Operacional</SelectItem>
                    <SelectItem value="COMMERCIAL">Comercial</SelectItem>
                    <SelectItem value="FINANCE">Financeiro</SelectItem>
                    <SelectItem value="ADMIN">Administrador</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button type="submit" className="w-full">
                <MailPlus className="h-4 w-4" />
                Enviar convite
              </Button>
            </form>
          </Card>

          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>E-mail</TableHead>
                  <TableHead>Papel</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Acoes</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {invitations.map((invitation) => {
                  const status = invitation.usedAt ? 'Aceito' : invitation.revokedAt ? 'Revogado' : 'Pendente';
                  return (
                    <TableRow key={invitation.id}>
                      <TableCell className="font-medium">{invitation.email}</TableCell>
                      <TableCell>{invitation.role}</TableCell>
                      <TableCell><Badge variant="outline">{status}</Badge></TableCell>
                      <TableCell>
                        <div className="flex justify-end gap-1">
                          {invitation.acceptUrl && (
                            <Button
                              variant="ghost"
                              size="icon"
                              title="Copiar link"
                              onClick={() => void navigator.clipboard.writeText(invitation.acceptUrl ?? '')}
                            >
                              <Copy className="h-4 w-4" />
                            </Button>
                          )}
                          {!invitation.usedAt && !invitation.revokedAt && (
                            <Button variant="ghost" size="icon" title="Revogar" onClick={() => void revokeInvitation(invitation)}>
                              <X className="h-4 w-4 text-destructive" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
                {invitations.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={4} className="py-10 text-center text-sm text-muted-foreground">
                      Nenhum convite pendente.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </Card>
        </div>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingId ? 'Editar usuario' : 'Novo usuario'}</DialogTitle>
            <DialogDescription>Crie acessos para sua equipe.</DialogDescription>
          </DialogHeader>
          <form onSubmit={onSubmit} className="grid gap-4">
            <div className="grid gap-1.5">
              <Label>E-mail</Label>
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div className="grid gap-1.5">
              <Label>{editingId ? 'Nova senha' : 'Senha'}</Label>
              <Input
                type="password"
                placeholder={editingId ? 'deixe em branco para manter' : 'minimo 6 caracteres'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required={!editingId}
              />
            </div>
            <div className="grid gap-1.5">
              <Label>Papel</Label>
              <Select value={newRole} onValueChange={setNewRole}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="USER">Usuario</SelectItem>
                  <SelectItem value="OPERATIONS">Operacional</SelectItem>
                  <SelectItem value="COMMERCIAL">Comercial</SelectItem>
                  <SelectItem value="FINANCE">Financeiro</SelectItem>
                  <SelectItem value="ADMIN">Administrador</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button type="submit" className="w-full">
              {editingId ? 'Salvar alteracoes' : 'Criar usuario'}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}

