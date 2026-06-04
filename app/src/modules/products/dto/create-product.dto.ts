import { IsInt, IsOptional, IsString, Length, Min } from 'class-validator';

export class CreateProductDto {
  @IsString()
  @Length(1, 40)
  sku!: string;

  @IsString()
  @Length(2, 120)
  name!: string;

  @IsOptional()
  @IsString()
  description?: string;

  /// Preco de venda em centavos.
  @IsInt()
  @Min(0)
  priceCents!: number;

  /// Custo em centavos.
  @IsInt()
  @Min(0)
  costCents!: number;

  @IsOptional()
  @IsString()
  unit?: string;
}
