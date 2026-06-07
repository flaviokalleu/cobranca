import { Type } from 'class-transformer';
import {
  IsDateString,
  IsIn,
  IsInt,
  IsNumber,
  Max,
  Min,
  ValidateIf,
} from 'class-validator';

export class SimulateLoanDto {
  @Type(() => Number)
  @IsInt()
  @Min(1000)
  principalCents!: number;

  @Type(() => Number)
  @IsNumber()
  @Min(0.01)
  @ValidateIf((dto: SimulateLoanDto) => dto.interestType === 'MONTHLY')
  @Max(20)
  monthlyInterestRate?: number;

  @Type(() => Number)
  @IsNumber()
  @Min(0.01)
  @ValidateIf((dto: SimulateLoanDto) => dto.interestType === 'YEARLY')
  @Max(240)
  yearlyInterestRate?: number;

  @IsIn(['MONTHLY', 'YEARLY'])
  interestType!: 'MONTHLY' | 'YEARLY';

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(60)
  installments!: number;

  @IsDateString()
  firstDueAt!: string;
}
