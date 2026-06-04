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
import { Pencil, Trash2, UserPlus } from 'lucide-react';

export default function UsuariosPage() {
  const dispatch = useAppDispatch();
  const role = useAppSelector((s) => s.auth.role);
  const { users } = useAppSelector((s) => s.data);

  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [newRole, setNewRole] = useState('USER');

  useEffect(() => {
    if (role === 'ADMIN') void dispatch(fetchUsers());
  }, [role, dispatch]);

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
        <PageHeader title="Usuarios" />
        <div className="p-6">
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

  return (
    <>
      <PageHeader
        title="Usuarios"
        description={`${users.length} no total`}
        actions={
          <Button onClick={openCreate}>
            <UserPlus className="h-4 w-4" />
            Novo usuario
          </Button>
        }
      />

      <div className="p-6">
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
