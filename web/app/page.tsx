'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { login } from '@/store/authSlice';
import { AuthShell } from '@/components/auth-shell';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export default function LoginPage() {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const { token, status, error } = useAppSelector((s) => s.auth);

  const [tenantId, setTenantId] = useState('demo');
  const [email, setEmail] = useState('admin@demo.com');
  const [password, setPassword] = useState('demo1234');

  useEffect(() => {
    if (token) router.push('/dashboard');
  }, [token, router]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const res = await dispatch(login({ tenantId, email, password }));
    if (login.fulfilled.match(res)) router.push('/dashboard');
  }

  return (
    <AuthShell title="Bem-vindo de volta" subtitle="Entre para gerenciar suas cobranças.">
      <form onSubmit={onSubmit} className="grid gap-4">
        <div className="grid gap-1.5">
          <Label htmlFor="tenant">Empresa</Label>
          <Input id="tenant" value={tenantId} onChange={(e) => setTenantId(e.target.value)} />
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="email">E-mail</Label>
          <Input id="email" value={email} onChange={(e) => setEmail(e.target.value)} />
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="password">Senha</Label>
          <Input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>
        {error && <p className="text-sm text-destructive">{error}</p>}
        <Button type="submit" className="w-full" disabled={status === 'loading'}>
          {status === 'loading' ? 'Entrando...' : 'Entrar'}
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-muted-foreground">
        Não tem conta?{' '}
        <Link href="/register" className="font-medium text-primary hover:underline">
          Cadastre-se
        </Link>
      </p>
      <p className="mt-2 text-center text-xs text-muted-foreground">
        Demo: demo / admin@demo.com / demo1234
      </p>
    </AuthShell>
  );
}
