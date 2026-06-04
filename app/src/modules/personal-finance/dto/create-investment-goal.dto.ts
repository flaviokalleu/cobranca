import { IsDateString, IsInt, IsOptional, IsString, Length, Min } from 'class-validator';

export class CreateInvestmentGoalDto {
  @IsString()
  @Length(2, 100)
  name!: string;

  @IsInt()
  @Min(1)
  targetCents!: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  currentCents?: number;

  @IsOptional()
  @IsDateString()
  dueDate?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}
