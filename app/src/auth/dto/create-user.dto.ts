import { IsEmail, IsIn, IsString, MinLength } from 'class-validator';
import { Role } from '../jwt-user.interface';

export class CreateUserDto {
  @IsEmail()
  email!: string;

  @IsString()
  @MinLength(6)
  password!: string;

  @IsIn(['ADMIN', 'AGENT'])
  role!: Role;
}
