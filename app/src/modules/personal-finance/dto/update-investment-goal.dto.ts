import { IsDateString, IsInt, IsOptional, IsString, Length, Min } from 'class-validator';

export class UpdateInvestmentGoalDto {
  @IsOptional()
  @IsString()
  @Length(2, 100)
  name?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  targetCents?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  currentCents?: number;

  @IsOptional()
  @IsDateString()
  dueDate?: string | null;

  @IsOptional()
  @IsString()
  notes?: string | null;
}
