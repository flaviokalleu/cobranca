import { IsEmail, IsIn, IsString, Length } from 'class-validator';

export class CreateInvitationDto {
  @IsEmail()
  email!: string;

  @IsIn(['ADMIN', 'FINANCE', 'COMMERCIAL', 'OPERATIONS', 'USER', 'AGENT'])
  role!: string;
}

export class AcceptInvitationDto {
  @IsString()
  @Length(2, 120)
  name!: string;

  @IsString()
  @Length(8, 80)
  password!: string;
}
