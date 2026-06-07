import { Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, IsString, Length, Min } from 'class-validator';

export class CreateChargeTemplateDto {
  @IsString()
  @Length(2, 80)
  name!: string;

  @IsString()
  @Length(2, 200)
  description!: string;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  amountCents!: number;

  @IsOptional()
  @IsString()
  category?: string;

  @IsOptional()
  @IsIn(['ONCE', 'MONTHLY'])
  recurrence?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  daysUntilDue?: number;
}

export class UpdateChargeTemplateDto {
  @IsOptional()
  @IsString()
  @Length(2, 80)
  name?: string;

  @IsOptional()
  @IsString()
  @Length(2, 200)
  description?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  amountCents?: number;

  @IsOptional()
  @IsString()
  category?: string;

  @IsOptional()
  @IsIn(['ONCE', 'MONTHLY'])
  recurrence?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  daysUntilDue?: number;
}

export class ApplyChargeTemplateDto {
  @IsString()
  customerId!: string;

  @IsOptional()
  @IsString()
  dueAt?: string;
}
