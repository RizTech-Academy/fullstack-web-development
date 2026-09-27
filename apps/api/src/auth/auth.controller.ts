import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Res,
  UseGuards,
} from "@nestjs/common";
import type { Response } from "express";
import { SESSION_COOKIE, type AuthUser } from "@kirana/shared";

import { CartService } from "../cart/cart.service";
import { readCartCookie, clearCartCookie } from "../cart/cart-cookie";
import { AuthService } from "./auth.service";
import { CurrentUser } from "./current-user.decorator";
import { LoginDto } from "./dto/login.dto";
import { RegisterDto } from "./dto/register.dto";
import { JwtAuthGuard } from "./jwt-auth.guard";
import { Req } from "@nestjs/common";
import type { Request } from "express";

const FIFTEEN_MINUTES_MS = 15 * 60 * 1000;

@Controller("auth")
export class AuthController {
  constructor(
    private readonly auth: AuthService,
    private readonly cart: CartService,
  ) {}

  @Post("register")
  async register(
    @Body() dto: RegisterDto,
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ): Promise<{ user: AuthUser }> {
    const { user, token } = await this.auth.register(dto);
    await this.adoptAnonymousCart(user.id, request, response);
    this.setSession(response, token);
    return { user };
  }

  @Post("login")
  @HttpCode(HttpStatus.OK)
  async login(
    @Body() dto: LoginDto,
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ): Promise<{ user: AuthUser }> {
    const { user, token } = await this.auth.login(dto);
    await this.adoptAnonymousCart(user.id, request, response);
    this.setSession(response, token);
    return { user };
  }

  @Post("logout")
  @HttpCode(HttpStatus.NO_CONTENT)
  logout(@Res({ passthrough: true }) response: Response): void {
    // Same options as when it was set, or the browser keeps the old cookie
    // alongside the empty one and the user stays logged in.
    response.clearCookie(SESSION_COOKIE, { path: "/" });
  }

  @Get("me")
  @UseGuards(JwtAuthGuard)
  me(@CurrentUser() user?: AuthUser): { user: AuthUser } {
    // The guard guarantees it. The cast is the price of an optional decorator.
    return { user: user as AuthUser };
  }

  /**
   * Whatever was in the cart before signing in must still be there after.
   *
   * Losing it is a real lost sale: somebody fills a basket, is asked to sign
   * in at checkout, and comes back to an empty cart.
   */
  private async adoptAnonymousCart(
    userId: string,
    request: Request,
    response: Response,
  ): Promise<void> {
    const anonymousToken = readCartCookie(request);
    if (!anonymousToken) return;

    await this.cart.mergeIntoUserCart(anonymousToken, userId);
    clearCartCookie(response);
  }

  private setSession(response: Response, token: string): void {
    response.cookie(SESSION_COOKIE, token, {
      // Unreadable from JavaScript, so an XSS bug cannot steal the session.
      httpOnly: true,
      // Sent on same-site requests and on top-level navigations, which is what
      // a link from an email needs. "strict" would break that.
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: FIFTEEN_MINUTES_MS,
    });
  }
}
