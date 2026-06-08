'use client';

import { useState } from 'react';
import { KeyRound, Plus } from 'lucide-react';
import { PageHeader } from '@/components/page-header';
import { PlainActivationCode } from '@/components/companies/ActivationCodeCard';
import { ActivationCodeList } from '@/components/companies/ActivationCodeList';
import { GenerateActivationCodeModal } from '@/components/companies/GenerateActivationCodeModal';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useCompanyActivationCodes } from '@/hooks/useCompanyActivationCodes';
import { useAppSelector } from '@/store/hooks';

export default function CurrentCompanyActivationCodesPage() {
  const tenantId = useAppSelector((state) => state.auth.tenantId);
  const [open, setOpen] = useState(false);
  const activation = useCompanyActivationCodes(tenantId);

  return (
    <>
      <PageHeader
        title="Ativar empresas"
        description="Crie codigos para ligar numeros de WhatsApp a empresa certa."
        actions={
          <Button onClick={() => setOpen(true)}>
            <Plus className="h-4 w-4" />
            Novo codigo
          </Button>
        }
      />
      <main className="space-y-6 p-6">
        {activation.lastCreatedCode && <PlainActivationCode code={activation.lastCreatedCode} />}
        {activation.error && (
          <Card className="border-destructive/40 bg-destructive/10">
            <CardContent className="p-4 text-sm text-destructive">{activation.error}</CardContent>
          </Card>
        )}
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <KeyRound className="h-4 w-4" />
          Empresa: {tenantId ?? 'carregando'}
        </div>
        <ActivationCodeList
          codes={activation.codes}
          saving={activation.saving}
          onRevoke={activation.revoke}
        />
      </main>
      <GenerateActivationCodeModal
        open={open}
        saving={activation.saving}
        onOpenChange={setOpen}
        onGenerate={(body) => {
          void activation.generate(body);
          setOpen(false);
        }}
      />
    </>
  );
}

