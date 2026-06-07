import {
  IsEmail,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Length,
  Matches,
  Min,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateCustomerDto {
  @ApiProperty({
    example: 'Maria Silva',
    description: 'Nome completo do cliente ou lead.',
    minLength: 2,
    maxLength: 120,
  })
  @IsString()
  @Length(2, 120)
  name!: string;

  @ApiPropertyOptional({
    example: '12345678909',
    description: 'CPF/CNPJ ou documento do cliente, conforme regra do negocio.',
    minLength: 5,
    maxLength: 20,
  })
  @IsOptional()
  @IsString()
  @Length(5, 20)
  document?: string;

  @ApiProperty({
    example: '+5511999999999',
    description: 'Telefone principal com 10 a 15 digitos, opcionalmente com + no inicio.',
  })
  @IsString()
  @Matches(/^\+?\d{10,15}$/, {
    message: 'phone deve ter de 10 a 15 digitos (opcionalmente com + no inicio)',
  })
  phone!: string;

  @ApiPropertyOptional({
    example: '+5511999999999',
    description: 'Numero de WhatsApp usado para lembretes e contato comercial.',
  })
  @IsOptional()
  @IsString()
  @Matches(/^\+?\d{10,15}$/, {
    message: 'whatsapp deve ter de 10 a 15 digitos (opcionalmente com + no inicio)',
  })
  whatsapp?: string;

  @ApiPropertyOptional({
    example: 'cliente@email.com',
    description: 'E-mail do cliente para contato e futuras notificacoes.',
  })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiPropertyOptional({
    example: 'Rua das Flores, 123',
    description: 'Endereco do cliente.',
  })
  @IsOptional()
  @IsString()
  address?: string;

  @ApiPropertyOptional({
    example: 'Sao Paulo',
    description: 'Cidade do cliente.',
  })
  @IsOptional()
  @IsString()
  city?: string;

  @ApiPropertyOptional({
    example: 'Autonomo',
    description: 'Profissao ou ocupacao informada no cadastro.',
  })
  @IsOptional()
  @IsString()
  profession?: string;

  @ApiPropertyOptional({
    example: 450000,
    description: 'Renda mensal em centavos para analise comercial/financeira.',
    minimum: 0,
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  incomeCents?: number;

  @ApiPropertyOptional({
    enum: [
      'LEAD',
      'FIRST_CONTACT',
      'DOCUMENTATION',
      'ANALYSIS',
      'APPROVED',
      'CONTRACT',
      'CUSTOMER',
      'LOST',
    ],
    example: 'LEAD',
    description: 'Etapa do funil comercial vinculada ao cliente/lead.',
  })
  @IsOptional()
  @IsIn([
    'LEAD',
    'FIRST_CONTACT',
    'DOCUMENTATION',
    'ANALYSIS',
    'APPROVED',
    'CONTRACT',
    'CUSTOMER',
    'LOST',
  ])
  stage?: string;
}
