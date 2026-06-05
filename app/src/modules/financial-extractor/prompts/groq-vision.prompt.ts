import { ReceiptType } from '../dto/extracted-transaction.dto';

export function buildGroqVisionPrompt(tipo: ReceiptType): string {
  return `Voce e um especialista em leitura visual de comprovantes bancarios brasileiros.

Analise a imagem enviada e extraia os dados financeiros visiveis com precisao maxima.

Tipo escolhido pelo usuario: ${tipo}

Regras de extracao:
1. Respeite sempre o tipo escolhido pelo usuario (receita ou gasto).
2. Extraia todos os campos visiveis: valor, data, hora, nome do pagador, nome do recebedor, CPF/CNPJ (mesmo mascarado), instituicao financeira, chave Pix, tipo de transferencia (Pix/TED/DOC/boleto), ID da transacao (EndToEndId / codigo E2E), codigo de autenticacao, numero de controle, banco emissor e situacao.
3. Nao invente dados. Se nao estiver legivel, use "nao identificado".
4. Valores: normalize para decimal com ponto sem simbolo de moeda. Ex: "R$ 1.500,00" → "1500.00".
5. Datas: normalize para YYYY-MM-DD. Horas para HH:mm:ss.
6. CPF/CNPJ mascarado: preserve exatamente como aparecer. Ex: "•••.687.121-••" ou "***123456**".
7. Chave Pix: pode ser CPF, CNPJ, e-mail, telefone ou chave aleatoria.
8. ID da transacao: codigos longos alfanumericos como "E18236120202606031619s1401f88e10".
9. Situacao: se o comprovante existe e mostra dados de transferencia concluida, use "efetivado".

Bancos e fintechs comuns no Brasil:
- "NU PAGAMENTOS", "NU PAGAMENTOS - IP", logo "nu" → Nubank
- "ITAU UNIBANCO", "Itau" → Itau
- "BANCO DO BRASIL", "BB" → Banco do Brasil
- "CAIXA ECONOMICA", "CEF" → Caixa
- "BRADESCO" → Bradesco
- "SANTANDER" → Santander
- "MERCADO PAGO", "MP" → Mercado Pago
- "PICPAY" → PicPay
- "BANCO INTER", "Inter" → Inter
- "C6 BANK", "C6" → C6
- "SICOOB", "SICREDI" → usar o nome exato

Retorne apenas JSON valido conforme o schema, sem explicacoes extras.`;
}
