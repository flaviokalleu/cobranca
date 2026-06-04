import { IsString, Length } from 'class-validator';

export class AskAiDto {
  @IsString()
  @Length(3, 500)
  question!: string;
}
