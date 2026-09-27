import { Body, Controller, Get, Param, Post, UseGuards } from "@nestjs/common";
import type { AuthUser, OrderDetail } from "@kirana/shared";

import { CurrentUser } from "../auth/current-user.decorator";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { CheckoutService } from "./checkout.service";
import { CheckoutDto } from "./dto/checkout.dto";

@Controller()
// Every route here needs a user, so the guard goes on the controller rather
// than being repeated — and forgotten — on one of them.
@UseGuards(JwtAuthGuard)
export class CheckoutController {
  constructor(private readonly checkout: CheckoutService) {}

  @Post("checkout")
  place(
    @Body() dto: CheckoutDto,
    @CurrentUser() user?: AuthUser,
  ): Promise<OrderDetail> {
    return this.checkout.placeOrder((user as AuthUser).id, dto);
  }

  @Get("orders/:orderNumber")
  find(
    @Param("orderNumber") orderNumber: string,
    @CurrentUser() user?: AuthUser,
  ): Promise<OrderDetail> {
    // Scoped to the user inside the service. An order number is guessable
    // enough that "knows the number" must never be the same as "may read it".
    return this.checkout.findForUser((user as AuthUser).id, orderNumber);
  }
}
