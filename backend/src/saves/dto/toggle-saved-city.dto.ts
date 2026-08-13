import { IsOptional, IsString, MinLength } from 'class-validator';

export class ToggleSavedCityDto {
  @IsString()
  @MinLength(1)
  cityId!: string;
}
