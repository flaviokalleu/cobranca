import { IsInt, IsOptional, IsString, Length, Min } from 'class-validator';

export class CreateLeadDto {
  @IsString()
  @Length(2, 120)
  name!: string;

  @IsOptional()
  @IsString()
  contact?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  estimatedCents?: number;

  @IsOptional()
  @IsString()
  notes?: string;
}
