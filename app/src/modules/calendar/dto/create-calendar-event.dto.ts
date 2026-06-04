import { IsDateString, IsIn, IsOptional, IsString, Length } from 'class-validator';

export class CreateCalendarEventDto {
  @IsString()
  @Length(2, 160)
  title!: string;

  @IsOptional()
  @IsIn(['MEETING', 'VISIT', 'CHARGE', 'CONTRACT', 'DUE_DATE', 'TASK'])
  type?: string;

  @IsDateString()
  startsAt!: string;

  @IsOptional()
  @IsDateString()
  endsAt?: string;

  @IsOptional()
  @IsString()
  customerId?: string;

  @IsOptional()
  @IsString()
  chargeId?: string;

  @IsOptional()
  @IsString()
  payableId?: string;

  @IsOptional()
  @IsString()
  taskId?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}
