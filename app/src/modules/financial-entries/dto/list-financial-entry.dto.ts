import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsOptional } from 'class-validator';
import { PaginationDto } from '../../../common/dto/pagination.dto';

export class ListFinancialEntryDto extends PaginationDto {
  @ApiPropertyOptional({
    enum: ['pending_confirmation', 'saved', 'corrected', 'cancelled', 'error'],
    default: 'saved',
  })
  @IsOptional()
  @IsIn(['pending_confirmation', 'saved', 'corrected', 'cancelled', 'error'])
  status?: string;
}
