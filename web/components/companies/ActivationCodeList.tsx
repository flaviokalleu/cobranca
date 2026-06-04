import type { ActivationCode } from '@/services/companyActivationApi';
import { ActivationCodeCard } from './ActivationCodeCard';

interface ActivationCodeListProps {
  codes: ActivationCode[];
  saving: boolean;
  onRevoke: (reference: string) => void;
}

export function ActivationCodeList({ codes, saving, onRevoke }: ActivationCodeListProps) {
  if (codes.length === 0) {
    return (
      <div className="rounded-md border bg-card p-10 text-center text-sm text-muted-foreground">
        Nenhum codigo de ativacao gerado.
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
      {codes.map((code) => (
        <ActivationCodeCard
          key={code.reference}
          code={code}
          saving={saving}
          onRevoke={onRevoke}
        />
      ))}
    </div>
  );
}
