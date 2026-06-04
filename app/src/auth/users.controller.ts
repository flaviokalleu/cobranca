import { Body, Controller, Delete, Get, Param, Patch, Post } from '@nestjs/common';
import { AuthService } from './auth.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { Roles } from './decorators/roles.decorator';
import { CurrentUser } from './decorators/current-user.decorator';
import { Tenant } from '../common/tenant/tenant.decorator';
import { JwtUser } from './jwt-user.interface';

@Controller('users')
export class UsersController {
  constructor(private readonly auth: AuthService) {}

  @Roles('ADMIN')
  @Post()
  create(@CurrentUser() user: JwtUser, @Body() dto: CreateUserDto) {
    return this.auth.createUser(user.tenantId, user.email, dto);
  }

  @Roles('ADMIN')
  @Get()
  list(@Tenant() tenantId: string) {
    return this.auth.list(tenantId);
  }

  @Roles('ADMIN')
  @Patch(':id')
  update(
    @CurrentUser() user: JwtUser,
    @Param('id') id: string,
    @Body() dto: UpdateUserDto,
  ) {
    return this.auth.updateUser(user.tenantId, user.sub, user.email, id, dto);
  }

  @Roles('ADMIN')
  @Delete(':id')
  remove(@CurrentUser() user: JwtUser, @Param('id') id: string) {
    return this.auth.deleteUser(user.tenantId, user.sub, user.email, id);
  }
}
