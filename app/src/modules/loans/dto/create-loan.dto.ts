import { Type } from 'class-transformer';
import { IsNumber, IsOptional, IsString, Max, Min } from 'class-validator';
import { SimulateLoanDto } from './simulate-loan.dto';

export class CreateLoanDto extends SimulateLoanDto {
  @IsString()
  customerId!: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Max(2)
  lateFeePercent?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Max(0.033)
  lateInterestDaily?: number;
}
