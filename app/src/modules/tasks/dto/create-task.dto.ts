import { IsDateString, IsIn, IsOptional, IsString, Length } from 'class-validator';

export class CreateTaskDto {
  @IsString()
  @Length(1, 200)
  title!: string;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsDateString()
  dueDate?: string;

  @IsOptional()
  @IsIn(['LOW', 'MED', 'HIGH'])
  priority?: string;

  @IsOptional()
  @IsString()
  assignee?: string;
}
