import { Body, Controller, Delete, Get, Post } from '@nestjs/common';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { PolicyResource } from '../../auth/decorators/policy.decorator';
import { Roles } from '../../auth/decorators/roles.decorator';
import { JwtUser } from '../../auth/jwt-user.interface';
import { Tenant } from '../../common/tenant/tenant.decorator';
import { PushSubscriptionDto } from './dto/push-subscription.dto';
import { PushService } from './push.service';

@PolicyResource('Notification')
@Controller('push')
export class PushController {
  constructor(private readonly push: PushService) {}

  @Roles('ADMIN', 'FINANCE', 'COMMERCIAL', 'OPERATIONS', 'USER', 'AGENT')
  @Get('public-key')
  publicKey() {
    return this.push.publicKey();
  }

  @Roles('ADMIN', 'FINANCE', 'COMMERCIAL', 'OPERATIONS', 'USER', 'AGENT')
  @Post('subscribe')
  subscribe(
    @Tenant() tenantId: string,
    @CurrentUser() user: JwtUser,
    @Body() dto: PushSubscriptionDto,
  ) {
    return this.push.subscribe(tenantId, user.sub, dto);
  }

  @Roles('ADMIN', 'FINANCE', 'COMMERCIAL', 'OPERATIONS', 'USER', 'AGENT')
  @Delete('subscribe')
  unsubscribe(@Tenant() tenantId: string, @Body() dto: { endpoint: string }) {
    return this.push.unsubscribe(tenantId, dto.endpoint);
  }
}
