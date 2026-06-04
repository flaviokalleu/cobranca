import type { ReactNode } from 'react';
import { Wallet, Check } from 'lucide-react';

interface AuthShellProps {
  title: string;
  subtitle: string;
  children: ReactNode;
}

const features = [
  'Cobranças com PIX (copia-e-cola) automático',
  'Lembretes pelo WhatsApp',
  'Caixa e recebíveis em tempo real',
];

export function AuthShell({ title, subtitle, children }: AuthShellProps) {
  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      {/* Painel de marca */}
      <div className="brand-gradient relative hidden flex-col justify-between overflow-hidden p-12 text-white lg:flex">
        <div className="flex items-center gap-2.5 text-lg font-semibold">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/20">
            <Wallet className="h-5 w-5" />
          </div>
          Cobrança
        </div>

        <div className="space-y-8">
          <h1 className="text-4xl font-bold leading-tight">
            Gestão de cobranças
            <br />
            simples e no controle.
          </h1>
          <ul className="space-y-4">
            {features.map((f) => (
              <li key={f} className="flex items-center gap-3 text-white/90">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-white/20">
                  <Check className="h-3.5 w-3.5" />
                </span>
                {f}
              </li>
            ))}
          </ul>
        </div>

        <p className="text-sm text-white/60">© 2026 Cobrança</p>

        {/* brilhos decorativos */}
        <div className="pointer-events-none absolute -right-24 -top-24 h-80 w-80 rounded-full bg-white/10 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-28 -left-16 h-80 w-80 rounded-full bg-black/10 blur-3xl" />
      </div>

      {/* Área do formulário */}
      <div className="flex items-center justify-center bg-muted/30 p-6">
        <div className="w-full max-w-sm">
          <div className="mb-8 flex items-center gap-2.5 lg:hidden">
            <div className="brand-gradient flex h-9 w-9 items-center justify-center rounded-xl text-white">
              <Wallet className="h-5 w-5" />
            </div>
            <span className="text-lg font-semibold">Cobrança</span>
          </div>
          <h2 className="text-2xl font-bold tracking-tight">{title}</h2>
          <p className="mb-6 mt-1.5 text-sm text-muted-foreground">{subtitle}</p>
          {children}
        </div>
      </div>
    </div>
  );
}
