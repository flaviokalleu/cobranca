import { IsEmail, IsOptional, IsString, Length, Matches } from 'class-validator';

export class CreateCustomerDto {
  @IsString()
  @Length(2, 120)
  name!: string;

  @IsString()
  @Matches(/^\+?\d{10,15}$/, {
    message: 'phone deve ter de 10 a 15 digitos (opcionalmente com + no inicio)',
  })
  phone!: string;

  @IsOptional()
  @IsEmail()
  email?: string;
}
