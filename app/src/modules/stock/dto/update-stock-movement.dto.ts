import { IsInt, IsOptional, IsString, Length } from 'class-validator';

export class UpdateStockMovementDto {
  /// Positivo entra no estoque, negativo sai.
  @IsOptional()
  @IsInt()
  qty?: number;

  @IsOptional()
  @IsString()
  @Length(2, 120)
  reason?: string;
}
