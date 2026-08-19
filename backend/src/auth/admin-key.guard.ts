import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ragAdminKey } from '../config/env';

/**
 * Protects admin-only routes (RAG seed/reindex) via `x-rag-admin-key` header.
 * In production RAG_ADMIN_KEY is required. In dev, missing key allows local use.
 */
@Injectable()
export class AdminKeyGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const expected = ragAdminKey();
    const req = context.switchToHttp().getRequest<{ headers: Record<string, string> }>();
    const provided =
      req.headers['x-rag-admin-key'] ||
      req.headers['X-Rag-Admin-Key'] ||
      '';

    if (!expected) {
      if (process.env.NODE_ENV === 'production') {
        throw new ForbiddenException('RAG admin routes are disabled (set RAG_ADMIN_KEY).');
      }
      return true;
    }

    if (!provided || provided !== expected) {
      throw new UnauthorizedException('Invalid admin key');
    }
    return true;
  }
}
