'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { register } from '@/store/authSlice';
import { AuthShell } from '@/components/auth-shell';
import { ArrowRight, Building2, Lock, Mail, Phone, User } from 'lucide-react';

function Field({ label, required, hint, children }: { label: string; required?: boolean; hint?: string; children: React.ReactNode }) {
  return (
    <div className="grid gap-1.5">
      <label className="auth-field-label">
        {label}{required && <span className="ml-0.5 text-red-500">*</span>}
      </label>
      {children}
      {hint && <p className="text-[11px] text-gray-400">{hint}</p>}
    </div>
  );
}

function formatCnpj(v: string) {
  const d = v.replace(/\D/g, '').slice(0, 14);
  if (d.length <= 11)
    return d.replace(/(\d{3})(\d{3})(\d{3})(\d{1,2})/, '$1.$2.$3-$4')
            .replace(/(\d{3})(\d{3})(\d{1,3})/, '$1.$2.$3')
            .replace(/(\d{3})(\d{1,3})/, '$1.$2');
  return d.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{1,2})/, '$1.$2.$3/$4-$5')
          .replace(/(\d{2})(\d{3})(\d{3})(\d{1,4})/, '$1.$2.$3/$4')
          .replace(/(\d{2})(\d{3})(\d{1,3})/, '$1.$2.$3')
          .replace(/(\d{2})(\d{1,3})/, '$1.$2');
}

function formatPhone(v: string) {
  const d = v.replace(/\D/g, '').slice(0, 11);
  if (d.length <= 10)
    return d.replace(/(\d{2})(\d{4})(\d{0,4})/, '($1) $2-$3').replace(/-$/, '');
  return d.replace(/(\d{2})(\d{5})(\d{0,4})/, '($1) $2-$3').replace(/-$/, '');
}

export default function RegisterPage() {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const { token, status, error } = useAppSelector((s) => s.auth);

  const [companyName, setCompanyName] = useState('');
  const [cpfCnpj, setCpfCnpj] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  useEffect(() => {
    if (token) router.push('/dashboard');
  }, [token, router]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const res = await dispatch(register({
      companyName,
      email,
      password,
      cpfCnpj: cpfCnpj || undefined,
      phone: phone || undefined,
    }));
    if (register.fulfilled.match(res)) router.push('/dashboard');
  }

  return (
    <AuthShell title="Criar conta" subtitle="Cadastre sua empresa para começar a cobrar.">
      <form onSubmit={onSubmit} className="grid gap-4">

        <Field label="Nome da empresa" required>
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
        </Field>

        <div className="grid grid-cols-2 gap-3">
          <Field label="CNPJ / CPF" required hint="Usado para identificação nas cobranças">
            <div className="auth-field-wrap">
              <User className="auth-field-icon" />
              <input
                className="auth-input"
                placeholder="00.000.000/0001-00"
                value={cpfCnpj}
                onChange={(e) => setCpfCnpj(formatCnpj(e.target.value))}
                required
                inputMode="numeric"
              />
            </div>
          </Field>

          <Field label="Telefone / Celular" required>
            <div className="auth-field-wrap">
              <Phone className="auth-field-icon" />
              <input
                className="auth-input"
                placeholder="(11) 99999-9999"
                value={phone}
                onChange={(e) => setPhone(formatPhone(e.target.value))}
                required
                inputMode="tel"
              />
            </div>
          </Field>
        </div>

        <Field label="E-mail" required>
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
        </Field>

        <Field label="Senha" required hint="Mínimo 6 caracteres">
          <div className="auth-field-wrap">
            <Lock className="auth-field-icon" />
            <input
              type="password"
              className="auth-input"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
              autoComplete="new-password"
            />
          </div>
        </Field>

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
        <Link href="/login" className="font-semibold text-red-600 hover:text-red-700">
          Fazer login
        </Link>
      </p>
    </AuthShell>
  );
}
