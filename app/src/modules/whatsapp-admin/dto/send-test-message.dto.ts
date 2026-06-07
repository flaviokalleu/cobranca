import { ApiProperty } from '@nestjs/swagger';
import { IsString, Length, Matches } from 'class-validator';

export class SendTestMessageDto {
  @ApiProperty({
    example: '5511999999999',
    description: 'Numero de destino do teste, apenas digitos ou +.',
  })
  @IsString()
  @Matches(/^\+?\d{10,15}$/, {
    message: 'to deve ter de 10 a 15 digitos (opcionalmente com + no inicio)',
  })
  to!: string;

  @ApiProperty({
    example: 'Teste do robo WEBBA ERP.',
    description: 'Mensagem de teste que sera enviada pelo WhatsApp conectado.',
    minLength: 1,
    maxLength: 1000,
  })
  @IsString()
  @Length(1, 1000)
  message!: string;
}
