import { IsIn, IsOptional, IsString, Length } from 'class-validator';

export class UpdateCustomerDocumentDto {
  @IsOptional()
  @IsString()
  requirementId?: string | null;

  @IsOptional()
  @IsString()
  @Length(2, 120)
  name?: string;

  @IsOptional()
  @IsIn(['NOT_SENT', 'SENT', 'IN_REVIEW', 'APPROVED', 'REJECTED'])
  status?: string;

  @IsOptional()
  @IsString()
  fileName?: string | null;

  @IsOptional()
  @IsString()
  fileUrl?: string | null;

  @IsOptional()
  @IsString()
  notes?: string | null;
}
