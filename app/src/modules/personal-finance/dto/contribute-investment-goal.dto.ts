import { IsInt, Min } from 'class-validator';

export class ContributeInvestmentGoalDto {
  @IsInt()
  @Min(1)
  amountCents!: number;
}
