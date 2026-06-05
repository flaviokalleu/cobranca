export type ReceiptType = 'receita' | 'gasto';
export type ExtractionConfidence = 'alta' | 'media' | 'baixa';
export type ExtractionSource = 'local' | 'groq' | 'local+groq';

export interface TransactionPartyDto {
  nome: string;
  documento: string;
  instituicao: string;
}

export interface ExtractedTransactionDto {
  tipo: ReceiptType;
  valor: string;
  moeda: 'BRL' | 'nao identificado';
  data_transacao: string;
  hora_transacao: string;
  pagador: TransactionPartyDto;
  recebedor: TransactionPartyDto;
  chave_pix: string;
  tipo_transferencia: string;
  id_transacao: string;
  codigo_autenticacao: string;
  numero_controle: string;
  banco_emissor: string;
  situacao: string;
  descricao: string;
  confianca: ExtractionConfidence;
  fonte_extracao: ExtractionSource;
  campos_duvidosos: string[];
}

export type Recorrencia = 'AVULSO' | 'MENSAL';

export interface ExtractReceiptInput {
  tipo: ReceiptType;
  recorrencia?: Recorrencia;
  text?: string;
  fileName?: string;
  mimeType?: string;
  mediaBase64?: string;
}
