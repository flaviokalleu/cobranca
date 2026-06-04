import { IsDateString, IsInt, IsOptional, IsString, Length, Min } from 'class-validator';

export class UpdatePayableDto {
  @IsOptional()
  @IsString()
  @Length(2, 200)
  description?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  amountCents?: number;

  @IsOptional()
  @IsDateString()
  dueDate?: string;

  @IsOptional()
  @IsString()
  supplierId?: string | null;

  @IsOptional()
  @IsString()
  category?: string | null;
}
