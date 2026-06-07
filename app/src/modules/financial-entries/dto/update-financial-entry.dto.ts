import { IsIn, IsInt, IsISO8601, IsOptional, IsString, Min } from 'class-validator';

export class UpdateFinancialEntryDto {
  @IsOptional()
  @IsString()
  descricao?: string;

  @IsOptional()
  @IsIn(['receita', 'gasto'])
  tipo?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  valorCents?: number;

  @IsOptional()
  @IsIn(['AVULSO', 'MENSAL'])
  recorrencia?: string;

  @IsOptional()
  @IsISO8601()
  dataTransacao?: string;

  @IsOptional()
  @IsString()
  pagadorNome?: string;

  @IsOptional()
  @IsIn(['pending_confirmation', 'saved', 'corrected', 'cancelled', 'error'])
  status?: string;
}
