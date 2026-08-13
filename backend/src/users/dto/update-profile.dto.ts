import { IsArray, IsBoolean, IsOptional, IsString, MinLength } from 'class-validator';

export class UpdateProfileDto {
  @IsOptional()
  @IsString()
  homeCityId?: string;

  @IsOptional()
  @IsString()
  @MinLength(2)
  homeCity?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  interests?: string[];

  @IsOptional()
  @IsString()
  travelStyle?: string;

  @IsOptional()
  @IsString()
  aboutCity?: string;

  @IsOptional()
  @IsBoolean()
  completed?: boolean;
}
