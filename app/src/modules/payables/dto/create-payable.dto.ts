import {
  IsDateString,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Length,
  Min,
} from 'class-validator';

export class CreatePayableDto {
  @IsString()
  @Length(2, 200)
  description!: string;

  @IsInt()
  @Min(1)
  amountCents!: number;

  @IsDateString()
  dueDate!: string;

  @IsOptional()
  @IsString()
  supplierId?: string;

  @IsOptional()
  @IsString()
  category?: string;

  @IsOptional()
  @IsIn(['ONCE', 'MONTHLY'])
  recurrence?: string;
}
