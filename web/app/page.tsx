'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { login } from '@/store/authSlice';
import { AuthShell } from '@/components/auth-shell';
import { ArrowRight, Lock, Mail, ShieldCheck } from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const { token, status, error, requiresTwoFactor } = useAppSelector((s) => s.auth);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [twoFactorCode, setTwoFactorCode] = useState('');

  useEffect(() => {
    if (token) router.push('/dashboard');
  }, [token, router]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const res = await dispatch(login({
      email,
      password,
      twoFactorCode: requiresTwoFactor ? twoFactorCode : undefined,
    }));
    if (login.fulfilled.match(res) && !('requiresTwoFactor' in res.payload)) {
      router.push('/dashboard');
    }
  }

  return (
    <AuthShell title="Bem-vindo de volta" subtitle="Acesse sua conta para continuar.">
      <form onSubmit={onSubmit} className="grid gap-5">
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
              autoComplete="email"
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
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="current-password"
            />
          </div>
        </div>

        {requiresTwoFactor && (
          <div className="grid gap-2">
            <label className="auth-field-label">Codigo 2FA</label>
            <div className="auth-field-wrap">
              <ShieldCheck className="auth-field-icon" />
              <input
                type="text"
                className="auth-input"
                placeholder="123456"
                value={twoFactorCode}
                onChange={(e) => setTwoFactorCode(e.target.value)}
                required
                inputMode="numeric"
                autoComplete="one-time-code"
              />
            </div>
          </div>
        )}

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
              Entrando...
            </>
          ) : (
            <>
              Entrar na plataforma
              <ArrowRight className="h-4 w-4" />
            </>
          )}
        </button>
      </form>

      <div className="auth-divider" />

      <div className="space-y-3 text-center">
        <p className="text-sm text-gray-500">
          Não tem conta?{' '}
          <Link href="/register" className="font-semibold text-red-600 hover:text-red-700">
            Cadastre sua empresa
          </Link>
        </p>
        <p className="text-xs text-gray-400">
          Demo: admin@demo.com · demo1234
        </p>
      </div>
    </AuthShell>
  );
}
