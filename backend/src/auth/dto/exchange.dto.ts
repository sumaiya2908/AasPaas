import { IsString, MinLength } from 'class-validator';

export class ExchangeDto {
  @IsString()
  @MinLength(16)
  code!: string;
}
