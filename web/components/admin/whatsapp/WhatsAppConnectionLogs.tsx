import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import type { WhatsappConnectionLog } from '@/services/whatsappAdminApi';

export function WhatsAppConnectionLogs({ logs }: { logs: WhatsappConnectionLog[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Eventos recentes</CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Data</TableHead>
              <TableHead>Acao</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Descricao</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {logs.map((log) => (
              <TableRow key={`${log.action}-${log.createdAt}`}>
                <TableCell>{new Date(log.createdAt).toLocaleString('pt-BR')}</TableCell>
                <TableCell className="font-medium">{log.action}</TableCell>
                <TableCell>{log.status ?? '-'}</TableCell>
                <TableCell>{log.description ?? '-'}</TableCell>
              </TableRow>
            ))}
            {logs.length === 0 && (
              <TableRow>
                <TableCell colSpan={4} className="py-10 text-center text-muted-foreground">
                  Nenhum evento registrado.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
