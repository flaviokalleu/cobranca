import { Copy, ShieldCheck, XCircle } from 'lucide-react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { ActivationCode } from '@/services/companyActivationApi';

interface ActivationCodeCardProps {
  code: ActivationCode;
  onRevoke: (reference: string) => void;
  saving: boolean;
}

export function ActivationCodeCard({ code, onRevoke, saving }: ActivationCodeCardProps) {
  const active = code.status === 'ACTIVE';
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <CardTitle className="flex items-center gap-2 text-sm">
          <ShieldCheck className="h-4 w-4" />
          {code.role}
        </CardTitle>
        <Badge variant={active ? 'success' : 'secondary'}>{code.status}</Badge>
      </CardHeader>
      <CardContent className="space-y-3 text-sm">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <p className="text-xs text-muted-foreground">Prefixo</p>
            <p className="font-medium">{code.codePrefix}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Usos</p>
            <p className="font-medium">
              {code.usedCount} / {code.maxUses}
            </p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Expira em</p>
            <p className="font-medium">
              {code.expiresAt ? new Date(code.expiresAt).toLocaleDateString('pt-BR') : 'Sem prazo'}
            </p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Permissoes</p>
            <p className="truncate font-medium">{code.permissions.join(', ') || '-'}</p>
          </div>
        </div>
        {active && (
          <Button
            variant="outline"
            size="sm"
            disabled={saving}
            onClick={() => onRevoke(code.reference)}
          >
            <XCircle className="h-4 w-4" />
            Revogar
          </Button>
        )}
      </CardContent>
    </Card>
  );
}

export function PlainActivationCode({ code }: { code: string }) {
  async function copy() {
    await navigator.clipboard.writeText(code);
    toast.success('Codigo copiado');
  }

  return (
    <Card className="border-emerald-300 bg-emerald-50">
      <CardContent className="flex flex-col gap-3 p-4 text-sm text-emerald-900 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="font-semibold">Codigo gerado</p>
          <p className="font-mono text-base">{code}</p>
        </div>
        <Button variant="outline" onClick={copy}>
          <Copy className="h-4 w-4" />
          Copiar
        </Button>
      </CardContent>
    </Card>
  );
}
