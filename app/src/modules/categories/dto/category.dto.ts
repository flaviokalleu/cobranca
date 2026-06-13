import { IsBoolean, IsIn, IsOptional, IsString, Length, Matches } from 'class-validator';

export class CreateCategoryDto {
  @IsString()
  @Length(2, 60)
  name!: string;

  @IsIn(['INCOME', 'EXPENSE'])
  type!: string;

  @IsOptional()
  @IsString()
  @Matches(/^#[0-9a-fA-F]{6}$/)
  color?: string;
}

export class UpdateCategoryDto {
  @IsOptional()
  @IsString()
  @Length(2, 60)
  name?: string;

  @IsOptional()
  @IsString()
  @Matches(/^#[0-9a-fA-F]{6}$/)
  color?: string;

  @IsOptional()
  @IsBoolean()
  active?: boolean;
}
