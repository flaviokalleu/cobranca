import { IsEmail, IsOptional, IsString, Length, MinLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class RegisterDto {
  @ApiProperty({ example: 'Minha Empresa Ltda', minLength: 2, maxLength: 80 })
  @IsString()
  @Length(2, 80)
  companyName!: string;

  @ApiProperty({ example: 'admin@empresa.com' })
  @IsEmail()
  email!: string;

  @ApiProperty({ example: 'senha-segura-123', minLength: 6 })
  @IsString()
  @MinLength(6)
  password!: string;

  @ApiPropertyOptional({ example: '12.345.678/0001-90', description: 'CNPJ ou CPF da empresa.' })
  @IsOptional()
  @IsString()
  @Length(11, 18)
  cpfCnpj?: string;

  @ApiPropertyOptional({ example: '(11) 99999-9999' })
  @IsOptional()
  @IsString()
  @Length(8, 20)
  phone?: string;

  @ApiPropertyOptional({ example: '$aas_prod_xxxx', description: 'Chave de API do Asaas para habilitar pagamentos.' })
  @IsOptional()
  @IsString()
  asaasApiKey?: string;
}
