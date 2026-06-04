import { IsInt, IsOptional, IsString, Length, Max, Min } from 'class-validator';

export class CreatePersonalCreditCardDto {
  @IsString()
  @Length(2, 80)
  name!: string;

  @IsInt()
  @Min(0)
  limitCents!: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(31)
  closingDay?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(31)
  dueDay?: number;
}
