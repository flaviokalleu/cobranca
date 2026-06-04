import { IsIn, IsOptional, IsString } from 'class-validator';

export class UpdateCustomerDocumentStatusDto {
  @IsIn(['NOT_SENT', 'SENT', 'IN_REVIEW', 'APPROVED', 'REJECTED'])
  status!: string;

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
