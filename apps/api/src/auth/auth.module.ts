import { MiddlewareConsumer, Module, NestModule } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { JwtModule } from "@nestjs/jwt";

import { CartModule } from "../cart/cart.module";
import { AuthController } from "./auth.controller";
import { AuthService } from "./auth.service";
import { JwtAuthGuard } from "./jwt-auth.guard";
import { SessionMiddleware } from "./session.middleware";

@Module({
  imports: [
    CartModule,
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const secret = config.get<string>("JWT_SECRET");

        // Fail at startup, not on the first login. A missing secret with a
        // fallback default is the same as no authentication at all.
        if (!secret || secret.length < 32) {
          throw new Error(
            "JWT_SECRET must be set and at least 32 characters. Generate one with: openssl rand -base64 32",
          );
        }

        return {
          secret,
          signOptions: { expiresIn: config.get<string>("JWT_EXPIRES_IN") ?? "15m" },
        };
      },
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtAuthGuard, SessionMiddleware],
})
export class AuthModule implements NestModule {
  /**
   * Applied here rather than in AppModule, and that is not a style choice.
   *
   * Nest resolves a middleware's constructor in the module that calls
   * `forRoutes`. Applying it from AppModule threw at startup —
   * "Nest can't resolve dependencies of the SessionMiddleware (?, PrismaService)"
   * — because `JwtService` only exists inside this module's injector. Exporting
   * the middleware does not help; the module that applies it must be able to
   * construct it.
   *
   * It runs on every route, including the public ones. It has to: the catalogue
   * does not need a user, but the cart does, and both are read on the same page.
   * Decoding the cookie without ever rejecting keeps the decision about who may
   * proceed in the guards, where it can be seen.
   */
  configure(consumer: MiddlewareConsumer): void {
    consumer.apply(SessionMiddleware).forRoutes("*");
  }
}
