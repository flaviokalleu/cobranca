import { IsIn } from 'class-validator';

export class ChangeStageDto {
  @IsIn([
    'LEAD',
    'FIRST_CONTACT',
    'DOCUMENTATION',
    'ANALYSIS',
    'APPROVED',
    'CONTRACT',
    'CUSTOMER',
    'LOST',
    'NEW',
    'CONTACTED',
    'PROPOSAL',
    'WON',
  ])
  stage!: string;
}
