import { Injectable, Logger, type NestMiddleware } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import type { NextFunction, Request, Response } from "express";
import { SESSION_COOKIE, type AuthUser } from "@kirana/shared";

import { PrismaService } from "../prisma/prisma.service";

type AuthenticatedRequest = Request & { user?: AuthUser };

/**
 * Decodes the session cookie on every request and, if it is valid, hangs the
 * user on the request. It never rejects — that is the guard's job.
 *
 * It reads the user from the database rather than trusting the token's claims,
 * so deactivating an account takes effect on the next request instead of
 * whenever the token happens to expire.
 */
@Injectable()
export class SessionMiddleware implements NestMiddleware {
  private readonly logger = new Logger(SessionMiddleware.name);

  constructor(
    private readonly jwt: JwtService,
    private readonly prisma: PrismaService,
  ) {}

  async use(
    request: AuthenticatedRequest,
    _response: Response,
    next: NextFunction,
  ): Promise<void> {
    const token = request.cookies?.[SESSION_COOKIE];
    if (!token) return next();

    try {
      const claims = await this.jwt.verifyAsync<{ sub: string }>(token);
      const user = await this.prisma.user.findFirst({
        where: { id: claims.sub, isActive: true },
        select: { id: true, name: true, email: true, phone: true, role: true },
      });

      if (user) request.user = user;
    } catch {
      // An expired or tampered token is the same as no token. Logging it at
      // error level would fill the log every time somebody leaves a tab open
      // overnight.
      this.logger.debug("Ignoring an invalid session cookie");
    }

    next();
  }
}
