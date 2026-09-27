import { Module } from "@nestjs/common";

import { OrdersModule } from "../orders/orders.module";
import { PaymentGateway } from "./gateway";
import { PaymentsController } from "./payments.controller";
import { PaymentsService } from "./payments.service";

@Module({
  imports: [OrdersModule],
  controllers: [PaymentsController],
  providers: [PaymentsService, PaymentGateway],
  exports: [PaymentsService],
})
export class PaymentsModule {}
