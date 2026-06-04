import { ExtractedTransactionDto, ReceiptType } from '../dto/extracted-transaction.dto';

export function buildGroqTextPrompt(input: {
  tipo: ReceiptType;
  fileName?: string;
  mimeType?: string;
  local: ExtractedTransactionDto;
  text: string;
}): string {
  return `Voce e um especialista em leitura de comprovantes bancarios brasileiros.

Analise o texto extraido de um comprovante financeiro e retorne somente JSON valido.

Tipo escolhido pelo usuario: ${input.tipo}
Nome do arquivo: ${input.fileName ?? 'nao informado'}
Tipo do arquivo: ${input.mimeType ?? 'nao informado'}
Resultado parcial da extracao local: ${JSON.stringify(input.local)}
Texto extraido do comprovante:
${input.text}

Regras:
1. Respeite sempre o tipo escolhido pelo usuario.
2. Nao invente dados.
3. Quando nao identificar com seguranca, use "nao identificado".
4. Normalize valores para decimal com ponto, sem simbolo de moeda.
5. Normalize datas para YYYY-MM-DD e horas para HH:mm:ss.
6. Preserve CPF/CNPJ mascarado exatamente como aparecer.
7. Retorne apenas JSON valido, sem explicacoes.`;
}
