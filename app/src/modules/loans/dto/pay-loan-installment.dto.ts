import { Type } from 'class-transformer';
import { IsInt, Min } from 'class-validator';

export class PayLoanInstallmentDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  amountCents!: number;
}
