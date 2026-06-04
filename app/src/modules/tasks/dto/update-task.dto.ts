import { IsBoolean, IsDateString, IsOptional, IsString, Length } from 'class-validator';

export class UpdateTaskDto {
  @IsOptional()
  @IsString()
  @Length(2, 160)
  title?: string;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsDateString()
  dueDate?: string;

  @IsOptional()
  @IsString()
  priority?: string;

  @IsOptional()
  @IsString()
  assignee?: string;

  @IsOptional()
  @IsBoolean()
  done?: boolean;
}
