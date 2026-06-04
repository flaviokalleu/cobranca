import { IsString, Length } from 'class-validator';

export class UpdateSettingsDto {
  @IsString()
  @Length(2, 100)
  pixKey!: string;

  @IsString()
  @Length(2, 25)
  merchantName!: string;

  @IsString()
  @Length(2, 15)
  merchantCity!: string;
}
