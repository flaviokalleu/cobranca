import { IsBoolean, IsIn, IsInt, IsOptional, IsString, Length, Max, Min } from 'class-validator';

export class UpdateSpendingLimitDto {
  @IsOptional()
  @IsString()
  @Length(2, 80)
  category?: string;

  @IsOptional()
  @IsIn(['MONTHLY', 'WEEKLY'])
  period?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  limitCents?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  alertThresholdPercent?: number;

  @IsOptional()
  @IsBoolean()
  active?: boolean;
}
