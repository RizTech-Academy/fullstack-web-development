import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";

import { validateEnv } from "./config/env";

import { AdminModule } from "./admin/admin.module";
import { AuthModule } from "./auth/auth.module";
import { CartModule } from "./cart/cart.module";
import { CategoriesModule } from "./categories/categories.module";
import { CheckoutModule } from "./checkout/checkout.module";
import { DeliveryModule } from "./delivery/delivery.module";
import { HealthModule } from "./health/health.module";
import { NotificationsModule } from "./notifications/notifications.module";
import { OrdersModule } from "./orders/orders.module";
import { PaymentsModule } from "./payments/payments.module";
import { PrismaModule } from "./prisma/prisma.module";
import { ProductsModule } from "./products/products.module";

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      cache: true,
      // Runs before anything else is constructed, so a missing variable is a
      // startup failure rather than a 500 on whichever route happens to need
      // it first.
      validate: validateEnv,
    }),
    PrismaModule,
    HealthModule,
    NotificationsModule,
    // AuthModule applies the session middleware to every route itself. It has
    // to: middleware is instantiated in the module that calls `forRoutes`, and
    // only AuthModule imports JwtModule.
    AuthModule,
    ProductsModule,
    CategoriesModule,
    CartModule,
    DeliveryModule,
    CheckoutModule,
    OrdersModule,
    PaymentsModule,
    AdminModule,
  ],
})
export class AppModule {}
