import { IsArray, IsInt, IsOptional, IsString, Max, Min, MinLength } from 'class-validator';

export class RagQueryDto {
  @IsString()
  @MinLength(1)
  citySlug!: string;

  @IsString()
  @MinLength(2)
  query!: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(20)
  topK?: number;
}

export class RagJourneyDto {
  @IsString()
  @MinLength(1)
  citySlug!: string;

  @IsOptional()
  @IsString()
  cityName?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(7)
  days?: number;

  @IsOptional()
  @IsString()
  vibe?: string;

  @IsOptional()
  @IsString()
  style?: string;

  @IsOptional()
  @IsString()
  food?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  interests?: string[];
}
