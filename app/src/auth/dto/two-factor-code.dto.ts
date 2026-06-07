import { ApiProperty } from '@nestjs/swagger';
import { IsString, Length } from 'class-validator';

export class TwoFactorCodeDto {
  @ApiProperty({
    example: '123456',
    description: 'Codigo TOTP de 6 digitos ou codigo de backup.',
  })
  @IsString()
  @Length(6, 16)
  code!: string;
}
