import { IsBoolean, IsIn, IsOptional, IsString, Length } from 'class-validator';

export class CreateAccountPlanDto {
  @IsString()
  @Length(1, 20)
  code!: string;

  @IsString()
  @Length(2, 120)
  name!: string;

  @IsIn(['REVENUE', 'EXPENSE', 'ASSET', 'LIABILITY'])
  type!: string;

  @IsOptional()
  @IsString()
  parentId?: string;
}

export class UpdateAccountPlanDto {
  @IsOptional()
  @IsString()
  @Length(1, 20)
  code?: string;

  @IsOptional()
  @IsString()
  @Length(2, 120)
  name?: string;

  @IsOptional()
  @IsIn(['REVENUE', 'EXPENSE', 'ASSET', 'LIABILITY'])
  type?: string;

  @IsOptional()
  @IsString()
  parentId?: string;

  @IsOptional()
  @IsBoolean()
  active?: boolean;
}
