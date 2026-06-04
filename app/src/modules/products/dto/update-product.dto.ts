import { IsBoolean, IsInt, IsOptional, IsString, Length, Min } from 'class-validator';

export class UpdateProductDto {
  @IsOptional()
  @IsString()
  @Length(1, 40)
  sku?: string;

  @IsOptional()
  @IsString()
  @Length(2, 120)
  name?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  priceCents?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  costCents?: number;

  @IsOptional()
  @IsString()
  unit?: string;

  @IsOptional()
  @IsBoolean()
  active?: boolean;
}
