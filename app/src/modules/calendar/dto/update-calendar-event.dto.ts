import { IsDateString, IsIn, IsOptional, IsString, Length } from 'class-validator';

export class UpdateCalendarEventDto {
  @IsOptional()
  @IsString()
  @Length(2, 160)
  title?: string;

  @IsOptional()
  @IsIn(['MEETING', 'VISIT', 'CHARGE', 'CONTRACT', 'DUE_DATE', 'TASK'])
  type?: string;

  @IsOptional()
  @IsDateString()
  startsAt?: string;

  @IsOptional()
  @IsDateString()
  endsAt?: string | null;

  @IsOptional()
  @IsIn(['SCHEDULED', 'DONE', 'CANCELED'])
  status?: string;

  @IsOptional()
  @IsString()
  customerId?: string | null;

  @IsOptional()
  @IsString()
  chargeId?: string | null;

  @IsOptional()
  @IsString()
  payableId?: string | null;

  @IsOptional()
  @IsString()
  taskId?: string | null;

  @IsOptional()
  @IsString()
  notes?: string | null;
}
