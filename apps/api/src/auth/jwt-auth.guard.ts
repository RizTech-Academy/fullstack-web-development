import { CanActivate, ExecutionContext, Injectable } from "@nestjs/common";
import type { Request } from "express";
import type { AuthUser } from "@kirana/shared";

import { AppException } from "../common/app-exception";

/**
 * The session middleware has already decoded the cookie if there was one. This
 * guard only decides whether the route is allowed to continue without a user,
 * which keeps token handling in exactly one place.
 */
@Injectable()
export class JwtAuthGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context
      .switchToHttp()
      .getRequest<Request & { user?: AuthUser }>();

    if (!request.user) throw AppException.unauthenticated();
    return true;
  }
}
