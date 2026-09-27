import {
  Body,
  Controller,
  Headers,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Req,
  UseGuards,
} from "@nestjs/common";
import type { Request } from "express";
import type { AuthUser, PaymentIntent, PaymentWebhookEvent } from "@kirana/shared";

import { CurrentUser } from "../auth/current-user.decorator";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { Roles, RolesGuard } from "../auth/roles.guard";
import { PaymentsService } from "./payments.service";

type RawBodyRequest = Request & { rawBody?: Buffer };

@Controller("payments")
export class PaymentsController {
  constructor(private readonly payments: PaymentsService) {}

  @Post(":orderNumber/intent")
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  createIntent(
    @Param("orderNumber") orderNumber: string,
    @CurrentUser() user?: AuthUser,
  ): Promise<PaymentIntent> {
    return this.payments.createIntent((user as AuthUser).id, orderNumber);
  }

  /**
   * The gateway's callback. **No guard, by necessity** — the gateway has no
   * session — and therefore the signature is the only thing standing between
   * this endpoint and anybody on the internet marking orders paid.
   */
  @Post("webhook")
  @HttpCode(HttpStatus.OK)
  webhook(
    @Req() request: RawBodyRequest,
    @Headers("x-kirana-signature") signature?: string,
  ): Promise<{ received: true }> {
    // The raw bytes, not the parsed body. A signature is over exactly what was
    // sent, and re-serialising a parsed object produces something else.
    const raw = request.rawBody?.toString("utf8") ?? "";
    return this.payments.handleWebhook(raw, signature);
  }

  @Post("expire-stale")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("ADMIN")
  @HttpCode(HttpStatus.OK)
  expireStale(): Promise<{ cancelled: string[] }> {
    return this.payments.expireStale();
  }

  @Post(":orderNumber/refund")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("ADMIN")
  @HttpCode(HttpStatus.OK)
  refund(@Param("orderNumber") orderNumber: string): Promise<{ refunded: number }> {
    return this.payments.refund(orderNumber);
  }

  /**
   * Development only: signs and posts a webhook to ourselves, the way the
   * gateway would.
   *
   * Registered only when NODE_ENV is not production — see payments.module.ts.
   * Its whole purpose is that the customer's browser still cannot mark an order
   * paid: this asks the *server* to send itself a properly signed event, which
   * is what a real gateway does from its own machines.
   */
  @Post("simulate")
  @HttpCode(HttpStatus.OK)
  async simulate(
    @Body() body: { providerRef: string; orderNumber: string; amountPaise: number; succeed: boolean },
  ): Promise<{ received: true }> {
    const event: PaymentWebhookEvent = {
      event: body.succeed ? "payment.succeeded" : "payment.failed",
      providerRef: body.providerRef,
      orderNumber: body.orderNumber,
      amountPaise: body.amountPaise,
      eventId: `evt_${Date.now()}`,
    };

    const raw = JSON.stringify(event);
    return this.payments.handleWebhook(raw, this.payments.signForSimulator(raw));
  }
}
