import {
  BadRequestException,
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { randomBytes } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { UsersService } from '../users/users.service';
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
    if (!appRedirect?.trim()) {
      throw new BadRequestException('appRedirect is required');
    }

    const state = this.jwt.sign(
      { appRedirect: appRedirect.trim(), n: randomBytes(8).toString('hex') },
      { expiresIn: '10m' },
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
      const payload = this.jwt.verify(state) as { appRedirect?: string };
      appRedirect = payload.appRedirect || '';
    } catch {
      throw new UnauthorizedException('Invalid OAuth state');
    }
    if (!appRedirect) {
      throw new BadRequestException('Missing appRedirect in state');
    }

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

    const auth = await this.oauth({
      provider: 'google',
      idToken: tokens.id_token,
    });

    const payload = Buffer.from(JSON.stringify(auth), 'utf8').toString(
      'base64url',
    );
    const join = appRedirect.includes('?') ? '&' : '?';
    return `${appRedirect}${join}payload=${payload}`;
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

    return this.tokenResponse(user);
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
      };
      if (payload.iss !== 'https://appleid.apple.com' || !payload.sub) {
        throw new UnauthorizedException('Invalid Apple issuer');
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

  private tokenResponse(user: TokenUser) {
    const accessToken = this.jwt.sign({ sub: user.id, email: user.email });
    return {
      accessToken,
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
