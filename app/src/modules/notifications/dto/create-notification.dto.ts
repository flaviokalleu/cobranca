import { IsDateString, IsIn, IsOptional, IsString, Length } from 'class-validator';

export class CreateNotificationDto {
  @IsOptional()
  @IsIn(['SYSTEM', 'WHATSAPP', 'EMAIL'])
  channel?: string;

  @IsString()
  @Length(2, 120)
  title!: string;

  @IsString()
  @Length(2, 1000)
  message!: string;

  @IsOptional()
  @IsString()
  entityType?: string;

  @IsOptional()
  @IsString()
  entityId?: string;

  @IsOptional()
  @IsDateString()
  scheduledAt?: string;
}
