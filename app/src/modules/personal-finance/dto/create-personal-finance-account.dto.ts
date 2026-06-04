import { IsIn, IsInt, IsOptional, IsString, Length, Min } from 'class-validator';

export class CreatePersonalFinanceAccountDto {
  @IsString()
  @Length(2, 80)
  name!: string;

  @IsOptional()
  @IsIn(['CHECKING', 'SAVINGS', 'CASH', 'INVESTMENT', 'WALLET'])
  type?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  balanceCents?: number;
}
