import {
  BadRequestException,
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { randomBytes, createHash } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { UsersService } from '../users/users.service';
import { isProduction } from '../config/env';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { OAuthDto } from './dto/oauth.dto';

type TokenUser = {
  id: string;
  email: string;
  name: string;
  provider: string;
  profile: {
    homeCityId: string | null;
    homeCity: string | null;
    interests: string;
    travelStyle: string | null;
    aboutCity: string | null;
    completed: boolean;
  } | null;
};

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly users: UsersService,
    private readonly jwt: JwtService,
  ) {}

  /** Google Web client redirect — must be added in Google Cloud Console. */
  googleCallbackUrl() {
    const port = process.env.PORT || '3001';
    return (
      process.env.GOOGLE_REDIRECT_URI ||
      `http://127.0.0.1:${port}/api/auth/google/callback`
    );
  }

  googleWebClientId() {
    return (
      process.env.GOOGLE_CLIENT_ID ||
      (process.env.GOOGLE_CLIENT_IDS || '').split(',')[0]?.trim() ||
      ''
    );
  }

  buildGoogleAuthUrl(appRedirect: string) {
    const clientId = this.googleWebClientId();
    const secret = process.env.GOOGLE_CLIENT_SECRET || '';
    if (!clientId || !secret) {
      throw new BadRequestException(
        'GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET not configured on the API',
      );
    }
    const safeRedirect = this.validateAppRedirect(appRedirect);

    // Use a stable OAUTH_STATE_SECRET if provided so hot-reloads don't
    // invalidate in-flight OAuth state tokens (dev convenience + prod safety).
    const stateSecret =
      process.env.OAUTH_STATE_SECRET || process.env.JWT_SECRET || '';
    const state = this.jwt.sign(
      { appRedirect: safeRedirect, n: randomBytes(8).toString('hex') },
      { secret: stateSecret, expiresIn: '10m' },
    );

    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: this.googleCallbackUrl(),
      response_type: 'code',
      scope: 'openid email profile',
      access_type: 'online',
      include_granted_scopes: 'true',
      prompt: 'select_account',
      state,
    });

    return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
  }

  async finishGoogleCode(code: string, state: string) {
    let appRedirect = '';
    try {
      const stateSecret =
        process.env.OAUTH_STATE_SECRET || process.env.JWT_SECRET || '';
      const payload = this.jwt.verify(state, { secret: stateSecret }) as {
        appRedirect?: string;
      };
      appRedirect = payload.appRedirect || '';
    } catch {
      throw new UnauthorizedException('Invalid OAuth state');
    }
    if (!appRedirect) {
      throw new BadRequestException('Missing appRedirect in state');
    }
    this.validateAppRedirect(appRedirect);

    const clientId = this.googleWebClientId();
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET || '';
    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: this.googleCallbackUrl(),
        grant_type: 'authorization_code',
      }),
    });
    if (!tokenRes.ok) {
      const errText = await tokenRes.text();
      throw new UnauthorizedException(`Google token exchange failed: ${errText}`);
    }
    const tokens = (await tokenRes.json()) as { id_token?: string };
    if (!tokens.id_token) {
      throw new UnauthorizedException('Google did not return an id_token');
    }

    const user = await this.upsertOAuthUser({
      provider: 'google',
      idToken: tokens.id_token,
    });
    const exchangeCode = await this.createOAuthExchangeCode(user.id);
    const join = appRedirect.includes('?') ? '&' : '?';
    return `${appRedirect}${join}code=${encodeURIComponent(exchangeCode)}`;
  }

  /** Exchange one-time OAuth code (from Google deep link) for session tokens. */
  async exchangeOAuthCode(code: string) {
    const row = await this.prisma.oAuthExchangeCode.findUnique({
      where: { code: code.trim() },
      include: { user: { include: { profile: true } } },
    });
    if (!row || row.usedAt || row.expiresAt.getTime() < Date.now()) {
      throw new UnauthorizedException('Invalid or expired OAuth code');
    }
    await this.prisma.oAuthExchangeCode.update({
      where: { id: row.id },
      data: { usedAt: new Date() },
    });
    return this.tokenResponse(row.user);
  }

  /** Rotate refresh token and issue a new access token. */
  async refreshSession(refreshToken: string) {
    const hash = this.hashToken(refreshToken);
    const row = await this.prisma.refreshToken.findFirst({
      where: {
        tokenHash: hash,
        revokedAt: null,
        expiresAt: { gt: new Date() },
      },
      include: { user: { include: { profile: true } } },
    });
    if (!row) {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }
    await this.prisma.refreshToken.update({
      where: { id: row.id },
      data: { revokedAt: new Date() },
    });
    return this.tokenResponse(row.user);
  }

  /** Revoke a single refresh token (logout). */
  async logout(refreshToken: string) {
    const hash = this.hashToken(refreshToken);
    await this.prisma.refreshToken.updateMany({
      where: { tokenHash: hash, revokedAt: null },
      data: { revokedAt: new Date() },
    });
    return { ok: true };
  }

  async revokeAllRefreshTokens(userId: string) {
    await this.prisma.refreshToken.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  async register(dto: RegisterDto) {
    const email = dto.email.trim().toLowerCase();
    const existing = await this.prisma.user.findUnique({ where: { email } });
    if (existing) {
      throw new ConflictException('An account with this email already exists');
    }

    const passwordHash = await bcrypt.hash(dto.password, 10);
    const user = await this.prisma.user.create({
      data: {
        email,
        name: dto.name.trim(),
        passwordHash,
        provider: 'email',
        profile: {
          create: { completed: false },
        },
        notificationPrefs: {
          create: {},
        },
      },
      include: { profile: true },
    });

    return this.tokenResponse(user);
  }

  async login(dto: LoginDto) {
    const email = dto.email.trim().toLowerCase();
    const user = await this.prisma.user.findUnique({
      where: { email },
      include: { profile: true },
    });
    if (!user || !user.passwordHash) {
      throw new UnauthorizedException('Invalid email or password');
    }

    const ok = await bcrypt.compare(dto.password, user.passwordHash);
    if (!ok) {
      throw new UnauthorizedException('Invalid email or password');
    }

    return this.tokenResponse(user);
  }

  async oauth(dto: OAuthDto) {
    const user = await this.upsertOAuthUser(dto);
    return this.tokenResponse(user);
  }

  private async upsertOAuthUser(dto: OAuthDto): Promise<TokenUser> {
    const identity = await this.verifyOAuthToken(dto);
    const email = identity.email.trim().toLowerCase();
    if (!email.includes('@')) {
      throw new UnauthorizedException('OAuth provider did not return an email');
    }

    let user = await this.prisma.user.findFirst({
      where: {
        OR: [
          { provider: dto.provider, providerId: identity.sub },
          { email },
        ],
      },
      include: { profile: true },
    });

    if (!user) {
      user = await this.prisma.user.create({
        data: {
          email,
          name: identity.name || email.split('@')[0],
          passwordHash: null,
          provider: dto.provider,
          providerId: identity.sub,
          profile: { create: { completed: false } },
          notificationPrefs: { create: {} },
        },
        include: { profile: true },
      });
    } else {
      user = await this.prisma.user.update({
        where: { id: user.id },
        data: {
          provider: dto.provider,
          providerId: identity.sub,
          name: identity.name || user.name,
        },
        include: { profile: true },
      });
      await this.prisma.notificationPreference.upsert({
        where: { userId: user.id },
        create: { userId: user.id },
        update: {},
      });
    }

    return user;
  }

  async me(userId: string) {
    return this.users.findPublicById(userId);
  }

  private async verifyOAuthToken(dto: OAuthDto): Promise<{
    sub: string;
    email: string;
    name?: string;
  }> {
    if (
      process.env.AUTH_DEV_SSO === 'true' &&
      dto.idToken.startsWith('dev.')
    ) {
      const email =
        dto.email?.trim().toLowerCase() ||
        `${dto.provider}.dev@aaspaas.local`;
      return {
        sub: dto.idToken,
        email,
        name: dto.name?.trim() || email.split('@')[0],
      };
    }

    if (dto.provider === 'google') {
      return this.verifyGoogle(dto.idToken);
    }
    return this.verifyApple(dto.idToken, dto.email, dto.name);
  }

  private async verifyGoogle(idToken: string) {
    const res = await fetch(
      `https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(idToken)}`,
    );
    if (!res.ok) {
      throw new UnauthorizedException('Invalid Google token');
    }
    const data = (await res.json()) as {
      sub?: string;
      email?: string;
      name?: string;
      aud?: string;
    };
    const allowed = (
      process.env.GOOGLE_CLIENT_IDS ||
      process.env.GOOGLE_CLIENT_ID ||
      ''
    )
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
    if (allowed.length && data.aud && !allowed.includes(data.aud)) {
      throw new UnauthorizedException('Google token audience mismatch');
    }
    if (!data.sub || !data.email) {
      throw new UnauthorizedException('Google token missing identity');
    }
    return {
      sub: data.sub,
      email: data.email,
      name: data.name,
    };
  }

  private async verifyApple(
    idToken: string,
    fallbackEmail?: string,
    fallbackName?: string,
  ) {
    const parts = idToken.split('.');
    if (parts.length < 2) {
      throw new UnauthorizedException('Invalid Apple token');
    }
    try {
      const payload = JSON.parse(
        Buffer.from(parts[1].replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString(
          'utf8',
        ),
      ) as {
        sub?: string;
        email?: string;
        iss?: string;
        aud?: string | string[];
        exp?: number;
      };
      if (payload.iss !== 'https://appleid.apple.com' || !payload.sub) {
        throw new UnauthorizedException('Invalid Apple issuer');
      }
      if (payload.exp && payload.exp * 1000 < Date.now()) {
        throw new UnauthorizedException('Apple token expired');
      }
      const aud = process.env.APPLE_CLIENT_ID;
      if (aud) {
        const audOk = Array.isArray(payload.aud)
          ? payload.aud.includes(aud)
          : payload.aud === aud;
        if (!audOk) throw new UnauthorizedException('Apple audience mismatch');
      }
      const email = payload.email || fallbackEmail;
      if (!email) {
        throw new UnauthorizedException('Apple did not provide an email');
      }
      return {
        sub: payload.sub,
        email,
        name: fallbackName,
      };
    } catch (e) {
      if (e instanceof UnauthorizedException) throw e;
      throw new UnauthorizedException('Could not parse Apple token');
    }
  }

  /** Block open redirects when bouncing OAuth back into the mobile app. */
  private validateAppRedirect(appRedirect: string): string {
    const trimmed = appRedirect.trim();
    if (!trimmed) {
      throw new BadRequestException('appRedirect is required');
    }

    let parsed: URL;
    try {
      parsed = new URL(trimmed);
    } catch {
      throw new BadRequestException('Invalid appRedirect URL');
    }

    const scheme = parsed.protocol.replace(':', '');
    if (scheme === 'aaspaas') {
      return trimmed;
    }

    if (!isProduction() && scheme === 'exp') {
      if (parsed.hostname === '127.0.0.1' || parsed.hostname === 'localhost') {
        return trimmed;
      }
    }

    const extra = (process.env.OAUTH_APP_REDIRECT_ALLOWLIST || '')
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
    for (const prefix of extra) {
      if (trimmed.startsWith(prefix)) return trimmed;
    }

    throw new BadRequestException('appRedirect is not allowlisted');
  }

  private hashToken(raw: string): string {
    return createHash('sha256').update(raw).digest('hex');
  }

  private refreshTtlDays(): number {
    const raw = Number(process.env.JWT_REFRESH_DAYS || 90);
    return Number.isFinite(raw) && raw > 0 ? raw : 90;
  }

  private async issueRefreshToken(userId: string): Promise<string> {
    const raw = randomBytes(32).toString('base64url');
    const expiresAt = new Date(
      Date.now() + this.refreshTtlDays() * 24 * 60 * 60 * 1000,
    );
    await this.prisma.refreshToken.create({
      data: {
        userId,
        tokenHash: this.hashToken(raw),
        expiresAt,
      },
    });
    return raw;
  }

  private async createOAuthExchangeCode(userId: string): Promise<string> {
    const code = randomBytes(24).toString('base64url');
    const ttlSec = Number(process.env.OAUTH_EXCHANGE_TTL_SEC || 120);
    const expiresAt = new Date(Date.now() + Math.max(30, ttlSec) * 1000);
    await this.prisma.oAuthExchangeCode.create({
      data: { userId, code, expiresAt },
    });
    return code;
  }

  private async tokenResponse(user: TokenUser) {
    const accessToken = this.jwt.sign({ sub: user.id, email: user.email });
    const refreshToken = await this.issueRefreshToken(user.id);
    return {
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        provider: user.provider,
      },
      profile: user.profile
        ? {
            homeCityId: user.profile.homeCityId,
            homeCity: user.profile.homeCity,
            interests: JSON.parse(user.profile.interests || '[]') as string[],
            travelStyle: user.profile.travelStyle,
            aboutCity: user.profile.aboutCity,
            completed: user.profile.completed,
          }
        : null,
    };
  }
}
