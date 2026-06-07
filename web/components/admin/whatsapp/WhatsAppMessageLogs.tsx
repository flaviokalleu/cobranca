import { MessageSquare } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import type { WhatsappMessageLog } from '@/services/whatsappAdminApi';

export function WhatsAppMessageLogs({ messages }: { messages: WhatsappMessageLog[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <MessageSquare className="h-4 w-4" />
          Mensagens recentes
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Data</TableHead>
              <TableHead>Direcao</TableHead>
              <TableHead>Telefone</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Resumo</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {messages.map((message) => (
              <TableRow key={`${message.createdAt}-${message.phone}-${message.status}`}>
                <TableCell>{new Date(message.createdAt).toLocaleString('pt-BR')}</TableCell>
                <TableCell>
                  <Badge variant={message.direction === 'OUTBOUND' ? 'secondary' : 'outline'}>
                    {message.direction === 'OUTBOUND' ? 'Enviada' : 'Recebida'}
                  </Badge>
                </TableCell>
                <TableCell>{message.phone ?? '-'}</TableCell>
                <TableCell>{message.messageType ?? '-'}</TableCell>
                <TableCell>{message.status}</TableCell>
                <TableCell className="max-w-[360px] truncate">{message.description ?? '-'}</TableCell>
              </TableRow>
            ))}
            {messages.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="py-10 text-center text-muted-foreground">
                  Nenhuma mensagem registrada.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
