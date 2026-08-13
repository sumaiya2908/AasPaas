import { IsIn, IsOptional, IsString, MinLength } from 'class-validator';

export class CreateSavedExperienceDto {
  @IsString()
  @MinLength(2)
  title!: string;

  @IsOptional()
  @IsString()
  body?: string;

  @IsOptional()
  @IsString()
  cityId?: string;

  @IsOptional()
  @IsString()
  cityName?: string;

  @IsOptional()
  @IsIn(['moment', 'place', 'custom', 'post'])
  source?: 'moment' | 'place' | 'custom' | 'post';

  @IsOptional()
  @IsString()
  sourceId?: string;
}
