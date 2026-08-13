import { IsOptional, IsString, MinLength } from 'class-validator';

export class RegisterPushDto {
  @IsString()
  @MinLength(8)
  token!: string;

  @IsOptional()
  @IsString()
  platform?: string;
}

export class SetCurrentCityDto {
  @IsString()
  @MinLength(1)
  citySlug!: string;
}
