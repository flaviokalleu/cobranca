import { Injectable } from '@nestjs/common';
import { ExtractedTransactionDto, ExtractionConfidence } from './dto/extracted-transaction.dto';
import { NormalizationService } from './normalization.service';

@Injectable()
export class ConfidenceService {
  constructor(private readonly normalization: NormalizationService) {}

  calculate(extracted: ExtractedTransactionDto): ExtractionConfidence {
    const hasValue = this.normalization.identified(extracted.valor);
    const hasDate = this.normalization.identified(extracted.data_transacao);
    const hasPayer = this.normalization.identified(extracted.pagador.nome);
    const hasReceiver = this.normalization.identified(extracted.recebedor.nome);

    if (hasValue && hasDate && hasPayer && hasReceiver) return 'alta';
    if (hasValue && (hasPayer || hasReceiver)) return 'media';
    return 'baixa';
  }

  doubtfulFields(extracted: ExtractedTransactionDto): string[] {
    const fields: string[] = [];
    if (!this.normalization.identified(extracted.valor)) fields.push('valor');
    if (!this.normalization.identified(extracted.data_transacao)) fields.push('data_transacao');
    if (!this.normalization.identified(extracted.pagador.nome)) fields.push('pagador.nome');
    if (!this.normalization.identified(extracted.recebedor.nome)) fields.push('recebedor.nome');
    return fields;
  }
}
