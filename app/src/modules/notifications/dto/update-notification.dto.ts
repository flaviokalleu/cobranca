import { IsDateString, IsIn, IsOptional, IsString, Length } from 'class-validator';

export class UpdateNotificationDto {
  @IsOptional()
  @IsIn(['SYSTEM', 'WHATSAPP', 'EMAIL'])
  channel?: string;

  @IsOptional()
  @IsString()
  @Length(2, 120)
  title?: string;

  @IsOptional()
  @IsString()
  @Length(2, 1000)
  message?: string;

  @IsOptional()
  @IsIn(['UNREAD', 'READ', 'QUEUED', 'SENT', 'FAILED'])
  status?: string;

  @IsOptional()
  @IsString()
  entityType?: string | null;

  @IsOptional()
  @IsString()
  entityId?: string | null;

  @IsOptional()
  @IsDateString()
  scheduledAt?: string | null;
}
