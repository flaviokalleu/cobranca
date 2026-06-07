import { IsEmail, IsIn, IsString, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Role } from '../jwt-user.interface';

export class CreateUserDto {
  @ApiProperty({
    example: 'operador@empresa.com',
    description: 'E-mail do usuario do tenant.',
  })
  @IsEmail()
  email!: string;

  @ApiProperty({
    example: 'senha-segura-123',
    description: 'Senha inicial do usuario.',
    minLength: 6,
  })
  @IsString()
  @MinLength(6)
  password!: string;

  @ApiProperty({
    enum: ['ADMIN', 'FINANCE', 'COMMERCIAL', 'OPERATIONS', 'USER', 'AGENT'],
    example: 'FINANCE',
    description: 'Papel RBAC do usuario dentro do tenant.',
  })
  @IsIn(['ADMIN', 'FINANCE', 'COMMERCIAL', 'OPERATIONS', 'USER', 'AGENT'])
  role!: Role;
}
