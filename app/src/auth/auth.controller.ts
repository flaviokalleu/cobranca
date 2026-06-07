import { Body, Controller, Get, Post } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { TwoFactorCodeDto } from './dto/two-factor-code.dto';
import { Public } from './decorators/public.decorator';
import { CurrentUser } from './decorators/current-user.decorator';
import { JwtUser } from './jwt-user.interface';

@ApiTags('Autenticação')
@Throttle({ default: { ttl: 60_000, limit: 5 } })
@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Public()
  @ApiOperation({ summary: 'Registrar empresa e usuario administrador' })
  @Post('register')
  register(@Body() dto: RegisterDto) {
    return this.auth.register(dto);
  }

  @Public()
  @ApiOperation({ summary: 'Autenticar usuario e obter JWT' })
  @Post('login')
  login(@Body() dto: LoginDto) {
    return this.auth.login(dto);
  }

  @ApiOperation({ summary: 'Consultar usuario autenticado' })
  @Get('me')
  me(@CurrentUser() user: JwtUser) {
    return this.auth.me(user.tenantId, user.sub);
  }

  @ApiOperation({ summary: 'Gerar segredo TOTP para habilitar 2FA' })
  @Post('2fa/setup')
  setupTwoFactor(@CurrentUser() user: JwtUser) {
    return this.auth.setupTwoFactor(user.tenantId, user.sub, user.email);
  }

  @ApiOperation({ summary: 'Habilitar 2FA apos validar TOTP' })
  @Post('2fa/enable')
  enableTwoFactor(@CurrentUser() user: JwtUser, @Body() dto: TwoFactorCodeDto) {
    return this.auth.enableTwoFactor(user.tenantId, user.sub, user.email, dto);
  }

  @ApiOperation({ summary: 'Desabilitar 2FA apos validar TOTP ou backup code' })
  @Post('2fa/disable')
  disableTwoFactor(@CurrentUser() user: JwtUser, @Body() dto: TwoFactorCodeDto) {
    return this.auth.disableTwoFactor(user.tenantId, user.sub, user.email, dto);
  }
}
