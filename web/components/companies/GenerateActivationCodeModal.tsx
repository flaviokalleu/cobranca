'use client';

import { useState } from 'react';
import { KeyRound, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { CreateActivationCodeInput } from '@/services/companyActivationApi';

interface GenerateActivationCodeModalProps {
  open: boolean;
  saving: boolean;
  onOpenChange: (open: boolean) => void;
  onGenerate: (body: CreateActivationCodeInput) => void;
}

export function GenerateActivationCodeModal({
  open,
  saving,
  onOpenChange,
  onGenerate,
}: GenerateActivationCodeModalProps) {
  const [role, setRole] = useState('FINANCE');
  const [maxUses, setMaxUses] = useState('1');
  const [expiresAt, setExpiresAt] = useState('');
  const [permissions, setPermissions] = useState('financial_entries:create');

  function submit(event: React.FormEvent) {
    event.preventDefault();
    onGenerate({
      role,
      maxUses: Number(maxUses || 1),
      expiresAt: expiresAt || undefined,
      permissions: permissions
        .split(',')
        .map((item) => item.trim())
        .filter(Boolean),
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <KeyRound className="h-4 w-4" />
            Novo codigo de ativacao
          </DialogTitle>
          <DialogDescription>O codigo puro sera exibido apenas uma vez.</DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="grid gap-4">
          <div className="grid gap-1.5">
            <Label>Perfil</Label>
            <Select value={role} onValueChange={setRole}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="OWNER">Dono</SelectItem>
                <SelectItem value="FINANCE">Financeiro</SelectItem>
                <SelectItem value="ACCOUNTANT">Contador</SelectItem>
                <SelectItem value="EMPLOYEE">Funcionario</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-1.5">
              <Label>Limite de usos</Label>
              <Input
                type="number"
                min="1"
                max="100"
                value={maxUses}
                onChange={(event) => setMaxUses(event.target.value)}
              />
            </div>
            <div className="grid gap-1.5">
              <Label>Validade</Label>
              <Input
                type="date"
                value={expiresAt}
                onChange={(event) => setExpiresAt(event.target.value)}
              />
            </div>
          </div>
          <div className="grid gap-1.5">
            <Label>Permissoes</Label>
            <Input
              value={permissions}
              onChange={(event) => setPermissions(event.target.value)}
            />
          </div>
          <Button type="submit" disabled={saving}>
            <Plus className="h-4 w-4" />
            Gerar codigo
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
