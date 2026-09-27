import { Module } from "@nestjs/common";
import { OrdersController } from "./orders.controller";
import { OrdersService } from "./orders.service";

@Module({
  controllers: [OrdersController],
  providers: [OrdersService],
  // The admin module changes statuses through the same service, so the state
  // machine has exactly one implementation.
  exports: [OrdersService],
})
export class OrdersModule {}
