import { Module } from "@nestjs/common";
import { CartController } from "./cart.controller";
import { CartService } from "./cart.service";

@Module({
  controllers: [CartController],
  providers: [CartService],
  // Checkout and the auth controller both need it, so it is exported rather
  // than instantiated twice.
  exports: [CartService],
})
export class CartModule {}
