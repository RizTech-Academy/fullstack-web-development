import { createParamDecorator, type ExecutionContext } from "@nestjs/common";
import type { Request } from "express";
import type { AuthUser } from "@kirana/shared";

/**
 * `@CurrentUser() user?: AuthUser`
 *
 * Optional on purpose: the cart works signed out. Routes that must have a user
 * say so with `@UseGuards(JwtAuthGuard)`, not by hoping this is set.
 */
export const CurrentUser = createParamDecorator(
  (_data: unknown, context: ExecutionContext): AuthUser | undefined =>
    context.switchToHttp().getRequest<Request & { user?: AuthUser }>().user,
);
