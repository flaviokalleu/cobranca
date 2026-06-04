import { IsBoolean, IsIn, IsInt, IsOptional, IsString, Length, Min } from 'class-validator';

export class UpdatePersonalFinanceAccountDto {
  @IsOptional()
  @IsString()
  @Length(2, 80)
  name?: string;

  @IsOptional()
  @IsIn(['CHECKING', 'SAVINGS', 'CASH', 'INVESTMENT', 'WALLET'])
  type?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  balanceCents?: number;

  @IsOptional()
  @IsBoolean()
  active?: boolean;
}
