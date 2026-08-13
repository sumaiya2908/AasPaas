import {
  IsArray,
  IsIn,
  IsOptional,
  IsString,
  MinLength,
} from 'class-validator';

export class CreatePostDto {
  @IsIn(['experience', 'question', 'avoid'])
  type!: 'experience' | 'question' | 'avoid';

  @IsString()
  @MinLength(3)
  text!: string;

  /** Prefer city name so users can post about any city */
  @IsOptional()
  @IsString()
  cityName?: string;

  @IsOptional()
  @IsString()
  cityId?: string;

  @IsOptional()
  @IsString()
  state?: string;

  @IsOptional()
  @IsString()
  neighborhood?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  vibeTags?: string[];
}
