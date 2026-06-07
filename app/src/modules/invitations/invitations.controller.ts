import { Body, Controller, Delete, Get, Param, Post } from '@nestjs/common';
import { Public } from '../../auth/decorators/public.decorator';
import { Roles } from '../../auth/decorators/roles.decorator';
import { PolicyAction, PolicyResource } from '../../auth/decorators/policy.decorator';
import { Tenant } from '../../common/tenant/tenant.decorator';
import { AcceptInvitationDto, CreateInvitationDto } from './dto/invitation.dto';
import { InvitationsService } from './invitations.service';

@Controller('invitations')
export class InvitationsController {
  constructor(private readonly invitations: InvitationsService) {}

  @Roles('ADMIN')
  @PolicyResource('Invitation')
  @Post()
  create(@Tenant() tenantId: string, @Body() dto: CreateInvitationDto) {
    return this.invitations.create(tenantId, dto);
  }

  @Roles('ADMIN')
  @PolicyResource('Invitation')
  @Get()
  list(@Tenant() tenantId: string) {
    return this.invitations.list(tenantId);
  }

  @Roles('ADMIN')
  @PolicyResource('Invitation')
  @PolicyAction('delete')
  @Delete(':id')
  revoke(@Tenant() tenantId: string, @Param('id') id: string) {
    return this.invitations.revoke(tenantId, id);
  }

  @Public()
  @Get('accept/:token')
  preview(@Param('token') token: string) {
    return this.invitations.preview(token);
  }

  @Public()
  @Post('accept/:token')
  accept(@Param('token') token: string, @Body() dto: AcceptInvitationDto) {
    return this.invitations.accept(token, dto);
  }
}
