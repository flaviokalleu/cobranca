import { IsIn } from 'class-validator';

export class ChangeStageDto {
  @IsIn(['NEW', 'CONTACTED', 'PROPOSAL', 'WON', 'LOST'])
  stage!: string;
}
