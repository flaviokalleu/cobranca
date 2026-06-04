import { IsInt, IsOptional, IsString, Length } from 'class-validator';

export class AdjustStockDto {
  @IsString()
  productId!: string;

  /// Positivo entra no estoque, negativo sai.
  @IsInt()
  qty!: number;

  @IsOptional()
  @IsString()
  @Length(2, 120)
  reason?: string;
}
