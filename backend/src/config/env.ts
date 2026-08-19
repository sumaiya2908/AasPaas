/**
 * Boot-time env validation — fail fast in production on weak config.
 */

const WEAK_SECRETS = new Set([
  'change-me',
  'aaspaas-dev-secret-change-me',
  'secret',
  'jwt-secret',
]);

export function isProduction(): boolean {
  return process.env.NODE_ENV === 'production';
}

export function assertProductionEnv(): void {
  if (!isProduction()) return;

  const jwt = process.env.JWT_SECRET?.trim();
  if (!jwt || jwt.length < 32 || WEAK_SECRETS.has(jwt.toLowerCase())) {
    throw new Error(
      'JWT_SECRET must be set to a strong random value (≥32 chars) in production.',
    );
  }

  if (process.env.AUTH_DEV_SSO === 'true') {
    throw new Error('AUTH_DEV_SSO must be false in production.');
  }

  const ragProvider = (process.env.RAG_EMBEDDING_PROVIDER || 'local').toLowerCase();
  if (ragProvider === 'local') {
    console.warn(
      '[security] RAG_EMBEDDING_PROVIDER=local in production — semantic quality will be poor. Use openai or disable Ask until upgraded.',
    );
  }
}

export function corsOrigins(): string[] | boolean {
  const raw = process.env.CORS_ORIGINS?.trim();
  if (!raw) {
    return isProduction()
      ? false
      : [
          'http://localhost:8081',
          'http://127.0.0.1:8081',
          'http://localhost:19006',
          'exp://127.0.0.1:8081',
        ];
  }
  if (raw === '*') return true;
  return raw.split(',').map((o) => o.trim()).filter(Boolean);
}

export function ragAdminKey(): string | null {
  const key = process.env.RAG_ADMIN_KEY?.trim();
  return key || null;
}
