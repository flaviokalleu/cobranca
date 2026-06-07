import { IsEmail, IsOptional, IsString, Length, MinLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class LoginDto {
  @ApiProperty({
    example: 'admin@empresa.com',
    description: 'E-mail do usuario cadastrado.',
  })
  @IsEmail()
  email!: string;

  @ApiProperty({
    example: 'senha-segura-123',
    description: 'Senha do usuario.',
    minLength: 6,
  })
  @IsString()
  @MinLength(6)
  password!: string;

  @ApiPropertyOptional({
    example: 'minha-empresa',
    description: 'Slug do tenant quando o mesmo e-mail existir em mais de uma empresa.',
    minLength: 2,
    maxLength: 60,
  })
  @IsOptional()
  @IsString()
  @Length(2, 60)
  tenantSlug?: string;

  @ApiPropertyOptional({
    example: '123456',
    description: 'Codigo TOTP ou codigo de backup quando o 2FA estiver ativo.',
    minLength: 6,
    maxLength: 16,
  })
  @IsOptional()
  @IsString()
  @Length(6, 16)
  twoFactorCode?: string;
}
