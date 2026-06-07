import { Body, Controller, Delete, Get, Param, Patch, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { Roles } from './decorators/roles.decorator';
import { PolicyResource } from './decorators/policy.decorator';
import { CurrentUser } from './decorators/current-user.decorator';
import { Tenant } from '../common/tenant/tenant.decorator';
import { JwtUser } from './jwt-user.interface';

@ApiTags('Usuários')
@ApiBearerAuth('JWT')
@PolicyResource('User')
@Controller('users')
export class UsersController {
  constructor(private readonly auth: AuthService) {}

  @Roles('ADMIN')
  @ApiOperation({ summary: 'Criar usuario do tenant' })
  @Post()
  create(@CurrentUser() user: JwtUser, @Body() dto: CreateUserDto) {
    return this.auth.createUser(user.tenantId, user.email, dto);
  }

  @Roles('ADMIN')
  @ApiOperation({ summary: 'Listar usuarios do tenant' })
  @Get()
  list(@Tenant() tenantId: string) {
    return this.auth.list(tenantId);
  }

  @Roles('ADMIN')
  @ApiOperation({ summary: 'Atualizar usuario do tenant' })
  @Patch(':id')
  update(
    @CurrentUser() user: JwtUser,
    @Param('id') id: string,
    @Body() dto: UpdateUserDto,
  ) {
    return this.auth.updateUser(user.tenantId, user.sub, user.email, id, dto);
  }

  @Roles('ADMIN')
  @ApiOperation({ summary: 'Excluir usuario do tenant' })
  @Delete(':id')
  remove(@CurrentUser() user: JwtUser, @Param('id') id: string) {
    return this.auth.deleteUser(user.tenantId, user.sub, user.email, id);
  }
}
