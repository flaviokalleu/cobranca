import {
  IsDateString,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Length,
  Min,
} from 'class-validator';

export class UpdateChargeDto {
  @IsOptional()
  @IsString()
  @Length(2, 200)
  description?: string;

  @IsOptional()
  @IsDateString()
  dueDate?: string;

  @IsOptional()
  @IsString()
  @Length(2, 80)
  category?: string | null;

  @IsOptional()
  @IsIn(['ONCE', 'MONTHLY'])
  recurrence?: string;

  @IsOptional()
  @IsDateString()
  nextDueAt?: string | null;

  @IsOptional()
  @IsIn(['NONE', 'DAILY', 'WEEKLY', 'MONTHLY'])
  interestMode?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  interestRateBps?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  interestGraceDays?: number;
}
