import { IsEmail, IsInt, IsOptional, IsString, Length, Min } from 'class-validator';

export class CreateLeadDto {
  @IsString()
  @Length(2, 120)
  name!: string;

  @IsOptional()
  @IsString()
  contact?: string;

  @IsOptional()
  @IsString()
  document?: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsString()
  whatsapp?: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  city?: string;

  @IsOptional()
  @IsString()
  profession?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  incomeCents?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  estimatedCents?: number;

  @IsOptional()
  @IsString()
  notes?: string;
}
