import { IsDateString, IsOptional, IsString } from 'class-validator';

export class RunReconciliationDto {
  @IsString()
  accountId!: string;

  @IsOptional()
  @IsDateString()
  from?: string;

  @IsOptional()
  @IsDateString()
  to?: string;
}
