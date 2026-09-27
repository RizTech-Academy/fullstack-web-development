import { Body, Controller, Post, UseGuards } from "@nestjs/common";
import type { AuthUser, OrderDetail } from "@kirana/shared";

import { CurrentUser } from "../auth/current-user.decorator";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { CheckoutService } from "./checkout.service";
import { CheckoutDto } from "./dto/checkout.dto";

@Controller("checkout")
@UseGuards(JwtAuthGuard)
export class CheckoutController {
  constructor(private readonly checkout: CheckoutService) {}

  @Post()
  place(
    @Body() dto: CheckoutDto,
    @CurrentUser() user?: AuthUser,
  ): Promise<OrderDetail> {
    return this.checkout.placeOrder((user as AuthUser).id, dto);
  }
}
