import { IsString, IsOptional, IsDateString, IsInt, Min } from 'class-validator';

export class CreateConnectTokenDto {
  @IsOptional()
  @IsString()
  itemId?: string;
}

export class ItemWebhookDto {
  @IsString()
  event!: string;

  @IsString()
  itemId!: string;

  @IsOptional()
  @IsString()
  status?: string;
}

export class ListTransactionsDto {
  @IsOptional()
  @IsString()
  accountId?: string;

  @IsOptional()
  @IsDateString()
  from?: string;

  @IsOptional()
  @IsDateString()
  to?: string;

  @IsOptional()
  @IsString()
  category?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  page?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  limit?: number;
}
