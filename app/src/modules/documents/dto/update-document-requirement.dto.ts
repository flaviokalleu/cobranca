import { IsBoolean, IsOptional, IsString, Length } from 'class-validator';

export class UpdateDocumentRequirementDto {
  @IsOptional()
  @IsString()
  @Length(2, 120)
  name?: string;

  @IsOptional()
  @IsString()
  @Length(2, 80)
  category?: string;

  @IsOptional()
  @IsString()
  description?: string | null;

  @IsOptional()
  @IsBoolean()
  active?: boolean;
}
