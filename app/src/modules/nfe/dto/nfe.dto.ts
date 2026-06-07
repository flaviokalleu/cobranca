import { IsOptional, IsString, Length } from 'class-validator';

export class CancelNfeDto {
  @IsString()
  @Length(5, 200)
  reason!: string;
}

export class UpdateNfeSettingsDto {
  @IsOptional()
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
}
