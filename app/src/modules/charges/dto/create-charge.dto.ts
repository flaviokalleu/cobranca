import {
  IsDateString,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Length,
  Min,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateChargeDto {
  @ApiProperty({
    example: 'clx_customer_public_ref',
    description: 'Identificador do cliente dentro do tenant autenticado.',
  })
  @IsString()
  customerId!: string;

  /// Valor em CENTAVOS (ex.: R$ 49,90 = 4990). Nunca usar float para dinheiro.
  @ApiProperty({
    example: 4990,
    description: 'Valor da cobranca em centavos. Nunca envie valores monetarios em float.',
    minimum: 1,
  })
  @IsInt()
  @Min(1)
  amountCents!: number;

  @ApiProperty({
    example: 'Mensalidade do contrato',
    description: 'Descricao clara da cobranca exibida para financeiro e cliente.',
    minLength: 2,
    maxLength: 200,
  })
  @IsString()
  @Length(2, 200)
  description!: string;

  /// Data de vencimento em ISO-8601 (ex.: "2026-07-15").
  @ApiProperty({
    example: '2026-07-15',
    description: 'Data de vencimento em formato ISO-8601.',
  })
  @IsDateString()
  dueDate!: string;

  @ApiPropertyOptional({
    example: 'Mensalidades',
    description: 'Categoria financeira usada em filtros e fluxo de caixa.',
    minLength: 2,
    maxLength: 80,
  })
  @IsOptional()
  @IsString()
  @Length(2, 80)
  category?: string;

  @ApiPropertyOptional({
    enum: ['ONCE', 'MONTHLY'],
    example: 'MONTHLY',
    description: 'Tipo de recorrencia. MONTHLY cria novas cobrancas vencidas automaticamente.',
  })
  @IsOptional()
  @IsIn(['ONCE', 'MONTHLY'])
  recurrence?: string;

  @ApiPropertyOptional({
    example: '2026-08-15',
    description: 'Proxima data em que uma cobranca mensal deve ser gerada.',
  })
  @IsOptional()
  @IsDateString()
  nextDueAt?: string;

  @ApiPropertyOptional({
    enum: ['NONE', 'DAILY', 'WEEKLY', 'MONTHLY'],
    example: 'DAILY',
    description: 'Regra de juros por atraso. DAILY/WEEKLY/MONTHLY usam interestRateBps por unidade.',
  })
  @IsOptional()
  @IsIn(['NONE', 'DAILY', 'WEEKLY', 'MONTHLY'])
  interestMode?: string;

  @ApiPropertyOptional({
    example: 100,
    description: 'Taxa de juros em basis points. 100 = 1%.',
    minimum: 0,
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  interestRateBps?: number;

  @ApiPropertyOptional({
    example: 0,
    description: 'Dias de carencia antes de aplicar juros.',
    minimum: 0,
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  interestGraceDays?: number;
}
