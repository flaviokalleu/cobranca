import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsInt,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';

export class UpdateSalesItemDto {
  @IsString()
  productId!: string;

  @IsInt()
  @Min(1)
  qty!: number;
}

export class UpdateSalesOrderDto {
  @IsOptional()
  @IsString()
  customerId?: string;

  @IsOptional()
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => UpdateSalesItemDto)
  items?: UpdateSalesItemDto[];
}
