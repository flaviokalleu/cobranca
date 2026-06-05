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
1. Respeite sempre o tipo escolhido pelo usuario (receita ou gasto).
2. Nao invente dados. Quando nao identificar, use "nao identificado".
3. Valores: normalize para decimal com ponto sem simbolo. Ex: "R$ 1.500,00" → "1500.00".
4. Datas: normalize para YYYY-MM-DD. Horas para HH:mm:ss.
5. CPF/CNPJ mascarado: preserve exatamente como aparecer no texto.
6. Chave Pix: pode ser e-mail, CPF, telefone ou chave aleatoria.
7. ID da transacao: codigos longos alfanumericos como EndToEndId (ex: E18236120...).
8. Situacao: se o texto indica comprovante de transferencia concluida, use "efetivado".
9. Bancos: "NU PAGAMENTOS" ou "NU PAGAMENTOS - IP" → Nubank.
10. Retorne apenas JSON valido, sem explicacoes extras.`;
}
