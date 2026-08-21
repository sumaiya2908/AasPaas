import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Post,
  Query,
  Res,
  UseGuards,
} from '@nestjs/common';
import { SkipThrottle, Throttle } from '@nestjs/throttler';
import type { Response } from 'express';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { OAuthDto } from './dto/oauth.dto';
import { RefreshDto } from './dto/refresh.dto';
import { ExchangeDto } from './dto/exchange.dto';
import { JwtAuthGuard } from './jwt-auth.guard';
import { CurrentUser } from './current-user.decorator';

const authThrottle = {
  auth: {
    limit: Number(process.env.AUTH_RATE_LIMIT_PER_MIN || 15),
    ttl: 60_000,
  },
};

@Controller('auth')
@SkipThrottle({ default: true })
@Throttle(authThrottle)
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Post('register')
  register(@Body() dto: RegisterDto) {
    return this.auth.register(dto);
  }

  @Post('login')
  login(@Body() dto: LoginDto) {
    return this.auth.login(dto);
  }

  @Post('oauth')
  oauth(@Body() dto: OAuthDto) {
    return this.auth.oauth(dto);
  }

  @Post('exchange')
  exchange(@Body() dto: ExchangeDto) {
    return this.auth.exchangeOAuthCode(dto.code);
  }

  @Post('refresh')
  refresh(@Body() dto: RefreshDto) {
    return this.auth.refreshSession(dto.refreshToken);
  }

  @Post('logout')
  logout(@Body() dto: RefreshDto) {
    return this.auth.logout(dto.refreshToken);
  }

  /**
   * Browser Google OAuth start — redirect_uri is http://127.0.0.1:3001/...
   * (Google Web clients reject exp:// URIs used by Expo Go directly.)
   */
  @Get('google/start')
  googleStart(
    @Query('appRedirect') appRedirect: string,
    @Res() res: Response,
  ) {
    const url = this.auth.buildGoogleAuthUrl(appRedirect);
    return res.redirect(url);
  }

  @Get('google/callback')
  async googleCallback(
    @Query('code') code: string | undefined,
    @Query('state') state: string | undefined,
    @Query('error') error: string | undefined,
    @Res() res: Response,
  ) {
    if (error) {
      return res
        .status(400)
        .send(`<h1>Google sign-in failed</h1><p>${error}</p>`);
    }
    if (!code || !state) {
      throw new BadRequestException('Missing code or state');
    }
    try {
      const deepLink = await this.auth.finishGoogleCode(code, state);
      // Bounce back into the Expo app
      return res.send(`<!doctype html>
<html><head><meta charset="utf-8"/><title>Signing in…</title></head>
<body>
<p>Signed in — returning to AasPaas…</p>
<script>window.location.replace(${JSON.stringify(deepLink)});</script>
<a href=${JSON.stringify(deepLink)}>Continue</a>
</body></html>`);
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'OAuth failed';
      return res.status(400).send(`<h1>Google sign-in failed</h1><p>${msg}</p>`);
    }
  }

  @UseGuards(JwtAuthGuard)
  @Get('me')
  me(@CurrentUser() user: { userId: string }) {
    return this.auth.me(user.userId);
  }
}
