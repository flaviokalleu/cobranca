import { IsIn, IsOptional, IsString, Length } from 'class-validator';

export class IngestFinanceMessageDto {
  @IsString()
  @Length(2, 1000)
  message!: string;

  @IsOptional()
  @IsIn(['WHATSAPP_TEXT', 'WHATSAPP_AUDIO', 'WHATSAPP_IMAGE', 'WHATSAPP_PDF'])
  source?: string;

  @IsOptional()
  @IsString()
  attachmentUrl?: string;
}
