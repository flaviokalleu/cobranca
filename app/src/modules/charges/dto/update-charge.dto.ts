import {
  IsDateString,
  IsIn,
  IsOptional,
  IsString,
  Length,
} from 'class-validator';

export class UpdateChargeDto {
  @IsOptional()
  @IsString()
  @Length(2, 200)
  description?: string;

  @IsOptional()
  @IsDateString()
  dueDate?: string;

  @IsOptional()
  @IsString()
  @Length(2, 80)
  category?: string | null;

  @IsOptional()
  @IsIn(['ONCE', 'MONTHLY'])
  recurrence?: string;
}
