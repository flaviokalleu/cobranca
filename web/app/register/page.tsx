'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { register } from '@/store/authSlice';
import { AuthShell } from '@/components/auth-shell';
import { ArrowRight, Building2, Lock, Mail } from 'lucide-react';

export default function RegisterPage() {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const { token, status, error } = useAppSelector((s) => s.auth);

  const [companyName, setCompanyName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  useEffect(() => {
    if (token) router.push('/dashboard');
  }, [token, router]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const res = await dispatch(register({ companyName, email, password }));
    if (register.fulfilled.match(res)) router.push('/dashboard');
  }

  return (
    <AuthShell title="Criar conta" subtitle="O primeiro usuário entra como administrador.">
      <form onSubmit={onSubmit} className="grid gap-5">
        <div className="grid gap-2">
          <label className="auth-field-label">Nome da empresa</label>
          <div className="auth-field-wrap">
            <Building2 className="auth-field-icon" />
            <input
              className="auth-input"
              placeholder="Minha Empresa Ltda"
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              required
            />
          </div>
        </div>

        <div className="grid gap-2">
          <label className="auth-field-label">E-mail</label>
          <div className="auth-field-wrap">
            <Mail className="auth-field-icon" />
            <input
              type="email"
              className="auth-input"
              placeholder="voce@empresa.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
        </div>

        <div className="grid gap-2">
          <label className="auth-field-label">Senha</label>
          <div className="auth-field-wrap">
            <Lock className="auth-field-icon" />
            <input
              type="password"
              className="auth-input"
              placeholder="mínimo 6 caracteres"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
        </div>

        {error && <div className="auth-error">{error}</div>}

        <button
          type="submit"
          className="auth-btn mt-1"
          disabled={status === 'loading'}
        >
          {status === 'loading' ? (
            <>
              <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
              </svg>
              Criando...
            </>
          ) : (
            <>
              Criar minha conta
              <ArrowRight className="h-4 w-4" />
            </>
          )}
        </button>
      </form>

      <div className="auth-divider" />

      <p className="text-center text-sm text-gray-500">
        Já tem conta?{' '}
        <Link href="/" className="font-semibold text-red-600 hover:text-red-700">
          Fazer login
        </Link>
      </p>
    </AuthShell>
  );
}
