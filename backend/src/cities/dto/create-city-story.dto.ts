import { IsIn, IsOptional, IsString, MinLength } from 'class-validator';

export class CreateCityStoryDto {
  @IsString()
  @MinLength(1)
  cityId!: string;

  @IsString()
  @MinLength(8)
  content!: string;

  @IsOptional()
  @IsIn(['ONBOARDING', 'COMMUNITY'])
  source?: 'ONBOARDING' | 'COMMUNITY';
}
