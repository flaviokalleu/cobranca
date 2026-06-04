import { IsBoolean, IsInt, IsOptional, IsString, Length, Max, Min } from 'class-validator';

export class UpdatePersonalCreditCardDto {
  @IsOptional()
  @IsString()
  @Length(2, 80)
  name?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  limitCents?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(31)
  closingDay?: number | null;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(31)
  dueDay?: number | null;

  @IsOptional()
  @IsBoolean()
  active?: boolean;
}
