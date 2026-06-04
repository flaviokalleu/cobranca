import { IsDateString, IsOptional, IsString, Length } from 'class-validator';

export class UpdateChargeDto {
  @IsOptional()
  @IsString()
  @Length(2, 200)
  description?: string;

  @IsOptional()
  @IsDateString()
  dueDate?: string;
}
