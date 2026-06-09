import { IsBoolean, IsInt, IsOptional, IsString, Length, Min } from 'class-validator';

export class UpdateSettingsDto {
  @IsOptional()
  @IsString()
  @Length(0, 100)
  pixKey?: string;

  @IsOptional()
  @IsString()
  @Length(2, 25)
  merchantName?: string;

  @IsOptional()
  @IsString()
  @Length(2, 15)
  merchantCity?: string;

  @IsOptional()
  @IsString()
  @Length(2, 120)
  companyName?: string;

  @IsOptional()
  @IsString()
  @Length(11, 18)
  companyCnpj?: string;

  @IsOptional()
  @IsString()
  @Length(8, 20)
  companyPhone?: string;

  @IsOptional()
  @IsString()
  @Length(5, 120)
  companyEmail?: string;

  @IsOptional()
  @IsString()
  @Length(2, 200)
  companyAddress?: string;

  @IsOptional()
  @IsString()
  @Length(2, 80)
  companyCity?: string;

  @IsOptional()
  @IsString()
  @Length(2, 2)
  companyState?: string;

  @IsOptional()
  @IsString()
  @Length(2, 500)
  logoUrl?: string;

  @IsOptional()
  @IsString()
  businessHoursStart?: string;

  @IsOptional()
  @IsString()
  businessHoursEnd?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  reminderDaysBefore?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  defaultDueDays?: number;

  @IsOptional()
  @IsBoolean()
  notifyByEmail?: boolean;

  @IsOptional()
  @IsBoolean()
  notifyByWhatsapp?: boolean;

  @IsOptional()
  @IsString()
  timezone?: string;

  @IsOptional()
  @IsBoolean()
  nfeEnabled?: boolean;

  @IsOptional()
  @IsString()
  nfeCnpj?: string;

  @IsOptional()
  @IsString()
  nfeRazaoSocial?: string;

  @IsOptional()
  @IsString()
  nfeCodServico?: string;

  @IsOptional()
  @IsString()
  nfeCodMunicipio?: string;

  @IsOptional()
  @IsString()
  theme?: string;

  @IsOptional()
  @IsBoolean()
  chargeRobotEnabled?: boolean;
}
