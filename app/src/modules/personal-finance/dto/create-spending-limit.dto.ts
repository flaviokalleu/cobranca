import { IsIn, IsInt, IsOptional, IsString, Length, Max, Min } from 'class-validator';

export class CreateSpendingLimitDto {
  @IsString()
  @Length(2, 80)
  category!: string;

  @IsOptional()
  @IsIn(['MONTHLY', 'WEEKLY'])
  period?: string;

  @IsInt()
  @Min(1)
  limitCents!: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  alertThresholdPercent?: number;
}
