import {
  IsDateString,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Length,
  Min,
} from 'class-validator';

export class UpdatePersonalTransactionDto {
  @IsOptional()
  @IsString()
  accountId?: string | null;

  @IsOptional()
  @IsString()
  cardId?: string | null;

  @IsOptional()
  @IsIn(['EXPENSE', 'INCOME', 'TRANSFER'])
  type?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  amountCents?: number;

  @IsOptional()
  @IsString()
  @Length(2, 200)
  description?: string;

  @IsOptional()
  @IsString()
  category?: string;

  @IsOptional()
  @IsString()
  subcategory?: string | null;

  @IsOptional()
  @IsDateString()
  occurredAt?: string;

  @IsOptional()
  @IsIn([
    'MANUAL',
    'WHATSAPP_TEXT',
    'WHATSAPP_AUDIO',
    'WHATSAPP_IMAGE',
    'WHATSAPP_PDF',
    'IMPORT',
  ])
  source?: string;

  @IsOptional()
  @IsString()
  rawInput?: string | null;

  @IsOptional()
  @IsString()
  attachmentUrl?: string | null;
}
