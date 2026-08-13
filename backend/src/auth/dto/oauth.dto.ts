import { IsIn, IsOptional, IsString, MinLength } from 'class-validator';

export class OAuthDto {
  @IsIn(['google', 'apple'])
  provider!: 'google' | 'apple';

  /** Google ID token or Apple identity token. Use `dev.<id>` when AUTH_DEV_SSO=true. */
  @IsString()
  @MinLength(6)
  idToken!: string;

  @IsOptional()
  @IsString()
  email?: string;

  @IsOptional()
  @IsString()
  name?: string;
}
