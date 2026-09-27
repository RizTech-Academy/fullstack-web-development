import { CanActivate, ExecutionContext, Injectable, SetMetadata } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import type { Request } from "express";
import { ErrorCode, type AuthUser, type Role } from "@kirana/shared";
import { HttpStatus } from "@nestjs/common";

import { AppException } from "../common/app-exception";

export const ROLES_KEY = "roles";

/** `@Roles("ADMIN")` on a controller or a single route. */
export const Roles = (...roles: Role[]) => SetMetadata(ROLES_KEY, roles);

/**
 * Reads the role from the **database record** the session middleware loaded,
 * never from the token.
 *
 * A role baked into a JWT is a role that keeps working for the lifetime of the
 * token after you remove it. Fifteen minutes is not long; it is long enough for
 * a sacked employee to cancel a day of orders.
 */
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const required = this.reflector.getAllAndOverride<Role[] | undefined>(
      ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!required || required.length === 0) return true;

    const user = context
      .switchToHttp()
      .getRequest<Request & { user?: AuthUser }>().user;

    if (!user) throw AppException.unauthenticated();

    if (!required.includes(user.role)) {
      // 403, not 404: the route exists and they are signed in as somebody who
      // may not use it. Hiding that from a signed-in user helps nobody.
      throw new AppException(
        ErrorCode.FORBIDDEN,
        HttpStatus.FORBIDDEN,
        "You do not have access to the shop admin.",
      );
    }

    return true;
  }
}
