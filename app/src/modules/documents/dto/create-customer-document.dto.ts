import { IsIn, IsOptional, IsString, Length } from 'class-validator';

export class CreateCustomerDocumentDto {
  @IsOptional()
  @IsString()
  requirementId?: string;

  @IsString()
  @Length(2, 120)
  name!: string;

  @IsOptional()
  @IsIn(['NOT_SENT', 'SENT', 'IN_REVIEW', 'APPROVED', 'REJECTED'])
  status?: string;

  @IsOptional()
  @IsString()
  fileName?: string;

  @IsOptional()
  @IsString()
  fileUrl?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}
