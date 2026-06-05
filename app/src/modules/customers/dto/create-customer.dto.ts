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

export class CreateCustomerDto {
  @IsString()
  @Length(2, 120)
  name!: string;

  @IsOptional()
  @IsString()
  @Length(5, 20)
  document?: string;

  @IsString()
  @Matches(/^\+?\d{10,15}$/, {
    message: 'phone deve ter de 10 a 15 digitos (opcionalmente com + no inicio)',
  })
  phone!: string;

  @IsOptional()
  @IsString()
  @Matches(/^\+?\d{10,15}$/, {
    message: 'whatsapp deve ter de 10 a 15 digitos (opcionalmente com + no inicio)',
  })
  whatsapp?: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  address?: string;

  @IsOptional()
  @IsString()
  city?: string;

  @IsOptional()
  @IsString()
  profession?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  incomeCents?: number;

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
