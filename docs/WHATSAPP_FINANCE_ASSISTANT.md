# WEBBA WhatsApp Finance Assistant

## Posicionamento

Este modulo transforma o WEBBA em um copiloto financeiro operado pelo WhatsApp. O usuario registra gastos, receitas, contas, metas e perguntas em linguagem natural; o sistema classifica, valida, grava e responde com alertas e graficos no painel.

## Capacidades do Produto

- Registro por WhatsApp usando texto, audio, imagem ou PDF.
- Categorizacao automatica por IA em categoria e subcategoria.
- Lembretes de contas a pagar e a receber por WhatsApp, e-mail e sistema.
- Limites de gastos por categoria com alerta preventivo.
- Metas de investimento com valor alvo, aportes e progresso.
- Gestao compartilhada via usuarios do tenant e RBAC.
- Multiplas contas bancarias, caixa, carteiras e cartoes.
- Integracao futura com contas e investimentos via provedores externos.
- Graficos por categoria, periodo, conta, cartao e tipo de transacao.

## Fronteiras de Dominio

| Dominio | Responsabilidade |
| --- | --- |
| WhatsApp Provider | Conexao Whaileys, QR code, envio e recebimento |
| Conversation Bot | Interpretacao, confirmacao e execucao de comandos |
| Personal Finance | Contas, cartoes, transacoes, limites e metas |
| AI Classifier | Categoria, subcategoria, valor, data e confianca |
| Notifications | Alertas e lembretes por fila |
| Integrations | Sincronizacao bancaria e investimentos |

## Fluxo de Registro por WhatsApp

1. Mensagem chega pelo provider WhatsApp.
2. Bot identifica o tenant e o remetente autorizado.
3. IA extrai tipo, valor, descricao, data, categoria e subcategoria.
4. Se a confianca for baixa, o bot pede confirmacao.
5. Transacao e gravada com `tenantId`, origem e entrada bruta.
6. Sistema recalcula resumo, limites e alertas.
7. Auditoria registra a acao.

## Exemplos de Comandos

- `Gastei 42,90 no mercado hoje`
- `Recebi 3500 de salario`
- `Paguei internet 120 reais`
- `Criar limite de alimentacao de 1200 por mes`
- `Meta reserva de emergencia 20000`
- `Quanto gastei este mes?`
- `Me avise antes do cartao fechar`

## Integracao com Whaileys

O provider recomendado para a primeira versao e `whaileys`, instalado via `npm i whaileys` ou `npm i github:canove/whaileys`. Ele deve ficar atras de uma interface propria:

```ts
export abstract class WhatsAppProvider {
  abstract connect(tenantId: string): Promise<void>;
  abstract sendText(tenantId: string, to: string, text: string): Promise<void>;
  abstract onMessage(handler: WhatsAppMessageHandler): void;
}
```

Isso evita acoplamento com uma biblioteca nao oficial e permite migrar para WhatsApp Cloud API no futuro.

## Segurança

- Nunca aceitar comandos de telefone nao autorizado.
- Sempre filtrar e gravar dados por `tenantId`.
- Confirmar operacoes ambiguas antes de gravar.
- Auditar criacao de transacoes, limites e metas.
- Nao expor IDs internos nas respostas do bot.
- Processar midias por fila, com antivirus/OCR/STT em producao.
