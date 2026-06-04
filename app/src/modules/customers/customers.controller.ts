import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
} from '@nestjs/common';
import { CustomersService } from './customers.service';
import { CreateCustomerDto } from './dto/create-customer.dto';
import { UpdateCustomerDto } from './dto/update-customer.dto';
import { Tenant } from '../../common/tenant/tenant.decorator';
import { Roles } from '../../auth/decorators/roles.decorator';

@Controller('customers')
export class CustomersController {
  constructor(private readonly customers: CustomersService) {}

  @Roles('ADMIN', 'COMMERCIAL', 'OPERATIONS', 'AGENT')
  @Post()
  create(@Tenant() tenantId: string, @Body() dto: CreateCustomerDto) {
    return this.customers.create(tenantId, dto);
  }

  @Roles('ADMIN', 'COMMERCIAL', 'OPERATIONS', 'USER', 'AGENT')
  @Get()
  list(@Tenant() tenantId: string) {
    return this.customers.list(tenantId);
  }

  @Roles('ADMIN', 'COMMERCIAL', 'OPERATIONS', 'AGENT')
  @Patch(':id')
  update(
    @Tenant() tenantId: string,
    @Param('id') id: string,
    @Body() dto: UpdateCustomerDto,
  ) {
    return this.customers.update(tenantId, id, dto);
  }

  // Exclusao e destrutiva: somente ADMIN.
  @Roles('ADMIN')
  @Delete(':id')
  remove(@Tenant() tenantId: string, @Param('id') id: string) {
    return this.customers.remove(tenantId, id);
  }
}
