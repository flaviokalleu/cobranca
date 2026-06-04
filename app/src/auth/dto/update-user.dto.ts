import { IsEmail, IsIn, IsOptional, IsString, MinLength } from 'class-validator';
import { Role } from '../jwt-user.interface';

export class UpdateUserDto {
  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  @MinLength(6)
  password?: string;

  @IsOptional()
  @IsIn(['ADMIN', 'FINANCE', 'COMMERCIAL', 'OPERATIONS', 'USER', 'AGENT'])
  role?: Role;
}
