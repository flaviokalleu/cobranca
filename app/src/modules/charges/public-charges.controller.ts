import { Controller, Get, Param } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Public } from '../../auth/decorators/public.decorator';
import { ChargesService } from './charges.service';

@Public()
@ApiTags('Portal publico de pagamento')
@Controller('public/charges')
export class PublicChargesController {
  constructor(private readonly charges: ChargesService) {}

  @ApiOperation({ summary: 'Consultar cobranca publica pelo token' })
  @Get(':token')
  details(@Param('token') token: string) {
    return this.charges.publicDetails(token);
  }

  @ApiOperation({ summary: 'Consultar PIX atualizado da cobranca publica' })
  @Get(':token/pix')
  pix(@Param('token') token: string) {
    return this.charges.publicPix(token);
  }
}
