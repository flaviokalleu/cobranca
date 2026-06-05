import type { LucideIcon } from 'lucide-react';

type Accent = 'indigo' | 'green' | 'red' | 'slate' | 'orange';

const iconColors: Record<Accent, { bg: string; color: string }> = {
  indigo:  { bg: '#eef2ff', color: '#4f46e5' },
  green:   { bg: '#f0fdf4', color: '#16a34a' },
  red:     { bg: '#fff1f2', color: '#e53935' },
  slate:   { bg: '#f8fafc', color: '#475569' },
  orange:  { bg: '#fff7ed', color: '#ea580c' },
};

interface StatCardProps {
  label: string;
  value: string;
  hint?: string;
  sub?: string;
  icon: LucideIcon;
  accent: Accent;
  trend?: { value: string; up: boolean };
}

export function StatCard({ label, value, hint, sub, icon: Icon, accent, trend }: StatCardProps) {
  const ic = iconColors[accent];
  return (
    <div
      className="group relative overflow-hidden rounded-2xl bg-white p-5 transition-all hover:-translate-y-0.5 hover:shadow-lg"
      style={{ border: '1px solid #f0f0f0', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}
    >
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <p className="text-xs font-medium uppercase tracking-wider" style={{ color: '#9ca3af' }}>
            {label}
          </p>
          <p className="text-2xl font-bold tracking-tight text-gray-900">{value}</p>
          {hint && <p className="text-xs" style={{ color: '#9ca3af' }}>{hint}</p>}
          {sub && <p className="text-xs font-medium" style={{ color: '#6b7280' }}>{sub}</p>}
          {trend && (
            <span
              className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold"
              style={{
                background: trend.up ? '#f0fdf4' : '#fff1f2',
                color: trend.up ? '#16a34a' : '#e53935',
              }}
            >
              {trend.up ? '↑' : '↓'} {trend.value}
            </span>
          )}
        </div>
        <div
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl"
          style={{ background: ic.bg }}
        >
          <Icon className="h-5 w-5" style={{ color: ic.color }} />
        </div>
      </div>
      {/* Decoração sutil no canto */}
      <div
        className="pointer-events-none absolute -bottom-4 -right-4 h-16 w-16 rounded-full opacity-0 transition-opacity group-hover:opacity-100"
        style={{ background: ic.bg }}
      />
    </div>
  );
}
