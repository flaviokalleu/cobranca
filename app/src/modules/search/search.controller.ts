import { Controller, Get, Query } from '@nestjs/common';
import { Roles } from '../../auth/decorators/roles.decorator';
import { PolicyResource } from '../../auth/decorators/policy.decorator';
import { Tenant } from '../../common/tenant/tenant.decorator';
import { SearchService } from './search.service';

@PolicyResource('Search')
@Controller('search')
export class SearchController {
  constructor(private readonly searchService: SearchService) {}

  @Roles('ADMIN', 'FINANCE', 'COMMERCIAL', 'OPERATIONS', 'USER', 'AGENT')
  @Get()
  search(@Tenant() tenantId: string, @Query('q') q?: string) {
    return this.searchService.search(tenantId, q);
  }
}
