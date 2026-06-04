import { IsDateString, IsInt, IsString, Length, Min } from 'class-validator';

export class CreateChargeDto {
  @IsString()
  customerId!: string;

  /// Valor em CENTAVOS (ex.: R$ 49,90 = 4990). Nunca usar float para dinheiro.
  @IsInt()
  @Min(1)
  amountCents!: number;

  @IsString()
  @Length(2, 200)
  description!: string;

  /// Data de vencimento em ISO-8601 (ex.: "2026-07-15").
  @IsDateString()
  dueDate!: string;
}
