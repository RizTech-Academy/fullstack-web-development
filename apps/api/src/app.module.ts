import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";

import { AuthModule } from "./auth/auth.module";
import { CartModule } from "./cart/cart.module";
import { CategoriesModule } from "./categories/categories.module";
import { CheckoutModule } from "./checkout/checkout.module";
import { DeliveryModule } from "./delivery/delivery.module";
import { PrismaModule } from "./prisma/prisma.module";
import { ProductsModule } from "./products/products.module";

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, cache: true }),
    PrismaModule,
    // AuthModule applies the session middleware to every route itself. It has
    // to: middleware is instantiated in the module that calls `forRoutes`, and
    // only AuthModule imports JwtModule.
    AuthModule,
    ProductsModule,
    CategoriesModule,
    CartModule,
    DeliveryModule,
    CheckoutModule,
  ],
})
export class AppModule {}
