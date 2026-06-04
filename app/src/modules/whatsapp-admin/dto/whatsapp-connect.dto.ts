import { IsBoolean, IsOptional } from 'class-validator';

export class WhatsappConnectDto {
  @IsOptional()
  @IsBoolean()
  force?: boolean;
}
