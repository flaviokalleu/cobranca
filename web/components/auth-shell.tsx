import type { ReactNode } from 'react';
import Image from 'next/image';
import { BarChart2, MessageCircle, Layers, ShieldCheck } from 'lucide-react';

interface AuthShellProps {
  title: string;
  subtitle: string;
  children: ReactNode;
}

const features = [
  { icon: BarChart2,    text: 'Receitas e despesas em tempo real',       delay: '0.25s' },
  { icon: MessageCircle, text: 'Lembretes automáticos pelo WhatsApp',    delay: '0.35s' },
  { icon: Layers,       text: 'ERP completo: vendas, estoque e CRM',     delay: '0.45s' },
  { icon: ShieldCheck,  text: 'Segurança e auditoria em cada operação',  delay: '0.55s' },
];

const stats = [
  { value: '40+', label: 'Módulos' },
  { value: '100%', label: 'Web' },
  { value: '24/7', label: 'Online' },
];

export function AuthShell({ title, subtitle, children }: AuthShellProps) {
  return (
    <div className="grid min-h-screen lg:grid-cols-[1fr_480px]">

      {/* ── Painel esquerdo ── */}
      <div className="auth-left hidden lg:block">
        <div className="auth-left-grid" />
        <div className="auth-orb-1" />
        <div className="auth-orb-2" />
        <div className="auth-orb-3" />

        <div className="auth-left-content">
          {/* Logo */}
          <div className="auth-logo-float">
            <Image src="/logo.png" alt="WEBBA ERP" width={160} height={54} priority />
          </div>

          {/* Headline + features */}
          <div className="space-y-10">
            <div className="space-y-4">
              <h1 className="auth-headline">
                Gestão empresarial<br />
                <span>simples e inteligente.</span>
              </h1>
              <p style={{ color: 'rgba(255,255,255,0.45)', fontSize: '0.95rem', lineHeight: '1.6' }}>
                Tudo que sua empresa precisa em uma única plataforma — do financeiro ao CRM.
              </p>
            </div>

            <ul className="space-y-4">
              {features.map(({ icon: Icon, text, delay }) => (
                <li key={text} className="auth-feature-item" style={{ animationDelay: delay }}>
                  <span className="auth-feature-icon">
                    <Icon style={{ width: 16, height: 16, color: '#ef5350' }} />
                  </span>
                  {text}
                </li>
              ))}
            </ul>
          </div>

          {/* Stats */}
          <div>
            <div
              style={{
                height: 1,
                background: 'rgba(255,255,255,0.08)',
                marginBottom: 24,
              }}
            />
            <div className="flex items-center gap-8">
              {stats.map((s, i) => (
                <div key={s.label} className="flex items-center gap-8">
                  <div className="auth-stat">
                    <span className="auth-stat-value">{s.value}</span>
                    <span className="auth-stat-label">{s.label}</span>
                  </div>
                  {i < stats.length - 1 && <div className="auth-stats-divider" />}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ── Painel direito ── */}
      <div className="auth-right">
        <div className="auth-form-card">
          {/* Logo mobile */}
          <div className="mb-8 flex justify-center lg:hidden">
            <Image src="/logo.png" alt="WEBBA ERP" width={140} height={46} priority />
          </div>

          <h2 className="auth-form-title">{title}</h2>
          <p className="auth-form-subtitle">{subtitle}</p>

          <div className="mt-8">{children}</div>
        </div>
      </div>
    </div>
  );
}
