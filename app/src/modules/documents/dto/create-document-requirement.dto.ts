import { IsOptional, IsString, Length } from 'class-validator';

export class CreateDocumentRequirementDto {
  @IsString()
  @Length(2, 120)
  name!: string;

  @IsOptional()
  @IsString()
  @Length(2, 80)
  category?: string;

  @IsOptional()
  @IsString()
  description?: string;
}
