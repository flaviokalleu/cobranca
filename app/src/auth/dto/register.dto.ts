import { IsEmail, IsString, Length, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class RegisterDto {
  @ApiProperty({
    example: 'Minha Empresa',
    description: 'Nome da empresa que sera criada como tenant.',
    minLength: 2,
    maxLength: 80,
  })
  @IsString()
  @Length(2, 80)
  companyName!: string;

  @ApiProperty({
    example: 'admin@empresa.com',
    description: 'E-mail do primeiro usuario administrador.',
  })
  @IsEmail()
  email!: string;

  @ApiProperty({
    example: 'senha-segura-123',
    description: 'Senha inicial do administrador.',
    minLength: 6,
  })
  @IsString()
  @MinLength(6)
  password!: string;
}
