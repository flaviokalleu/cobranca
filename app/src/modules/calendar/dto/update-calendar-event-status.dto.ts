import { IsIn } from 'class-validator';

export class UpdateCalendarEventStatusDto {
  @IsIn(['SCHEDULED', 'DONE', 'CANCELED'])
  status!: string;
}
