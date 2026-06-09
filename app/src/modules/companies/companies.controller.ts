import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { Roles } from '../../auth/decorators/roles.decorator';
import { JwtUser } from '../../auth/jwt-user.interface';
import { CompanyActivationService } from './company-activation.service';
import { CreateActivationCodeDto } from './dto/create-activation-code.dto';

@Controller('companies')
@Roles('SUPERADMIN', 'ADMIN')
export class CompaniesController {
  constructor(private readonly activation: CompanyActivationService) {}

  // --- Endpoints self-service: ADMIN gerencia os codigos do proprio tenant ---

  @Get('my/activation-codes')
  listMyActivationCodes(@CurrentUser() user: JwtUser) {
    return this.activation.listActivationCodes(user, user.tenantId);
  }

  @Post('my/activation-codes')
  createMyActivationCode(
    @CurrentUser() user: JwtUser,
    @Body() dto: CreateActivationCodeDto,
  ) {
    return this.activation.createActivationCode(user, user.tenantId, dto);
  }

  @Post('my/activation-codes/:reference/revoke')
  revokeMyActivationCode(
    @CurrentUser() user: JwtUser,
    @Param('reference') reference: string,
  ) {
    return this.activation.revokeActivationCode(user, user.tenantId, reference);
  }

  // --- Endpoints admin/superadmin por companyRef ---

  @Get(':companyRef/activation-codes')
  listActivationCodes(
    @CurrentUser() user: JwtUser,
    @Param('companyRef') companyRef: string,
  ) {
    return this.activation.listActivationCodes(user, companyRef);
  }

  @Post(':companyRef/activation-codes')
  createActivationCode(
    @CurrentUser() user: JwtUser,
    @Param('companyRef') companyRef: string,
    @Body() dto: CreateActivationCodeDto,
  ) {
    return this.activation.createActivationCode(user, companyRef, dto);
  }

  @Post(':companyRef/activation-codes/:reference/revoke')
  revokeActivationCode(
    @CurrentUser() user: JwtUser,
    @Param('companyRef') companyRef: string,
    @Param('reference') reference: string,
  ) {
    return this.activation.revokeActivationCode(user, companyRef, reference);
  }
}
