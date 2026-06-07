import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsOptional, IsString, Length, Matches } from 'class-validator';

export class UpdateWhatsappSettingsDto {
  @ApiPropertyOptional({
    example: true,
    description: 'Define se o robo deve processar mensagens recebidas.',
  })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({
    example: 'Ola! Sou o assistente WEBBA ERP. Envie seu comprovante ou digite menu.',
    description: 'Mensagem inicial enviada para usuarios que pedem ajuda/menu.',
    maxLength: 1000,
  })
  @IsOptional()
  @IsString()
  @Length(0, 1000)
  welcomeMessage?: string | null;

  @ApiPropertyOptional({
    example: '5511999999999',
    description: 'Telefone padrao para alertas administrativos, apenas digitos ou +.',
  })
  @IsOptional()
  @IsString()
  @Matches(/^\+?\d{10,15}$/, {
    message: 'alertPhone deve ter de 10 a 15 digitos (opcionalmente com + no inicio)',
  })
  alertPhone?: string | null;
}
