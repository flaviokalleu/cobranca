import {
  IsDateString,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Length,
  Min,
} from 'class-validator';

export class CreatePersonalTransactionDto {
  @IsOptional()
  @IsString()
  accountId?: string;

  @IsOptional()
  @IsString()
  cardId?: string;

  @IsIn(['EXPENSE', 'INCOME', 'TRANSFER'])
  type!: string;

  @IsInt()
  @Min(1)
  amountCents!: number;

  @IsString()
  @Length(2, 200)
  description!: string;

  @IsOptional()
  @IsString()
  category?: string;

  @IsOptional()
  @IsString()
  subcategory?: string;

  @IsDateString()
  occurredAt!: string;

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
  rawInput?: string;

  @IsOptional()
  @IsString()
  attachmentUrl?: string;
}
