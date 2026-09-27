import { Logger, ValidationPipe } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import cookieParser from "cookie-parser";

import { AppModule } from "./app.module";
import { ApiExceptionFilter } from "./common/api-exception.filter";

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule, {
    // Keeps the unparsed bytes on `request.rawBody`. A webhook signature is
    // computed over exactly what was sent, and re-serialising a parsed body
    // produces different bytes and a signature that never matches.
    rawBody: true,
  });

  app.setGlobalPrefix("api");

  // Both the session and the anonymous cart live in cookies, and Express does
  // not parse them without this. Without it `request.cookies` is undefined and
  // every signed-in user looks anonymous — with no error anywhere.
  app.use(cookieParser());

  app.enableCors({
    // Validated at startup, so no fallback is needed here. A permissive
    // fallback is how an API ends up readable by any site on the internet
    // because somebody forgot a variable.
    origin: process.env.CORS_ORIGIN,
    credentials: true,
  });

  app.useGlobalPipes(
    new ValidationPipe({
      // Strips anything not on the DTO. Without this, an undeclared field
      // reaches your code — see the module 7 lesson.
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      // Deliberately no enableImplicitConversion: it overrides explicit
      // @Transform decorators, so ?inStock=false would arrive as true.
    }),
  );

  // One error shape for the whole API, so the front end has one code path.
  app.useGlobalFilters(new ApiExceptionFilter());

  // Finish in-flight requests before the process exits. Without this a deploy
  // kills the container mid-request, and for a checkout that means a customer
  // seeing an error for an order that was actually placed.
  app.enableShutdownHooks();

  const port = process.env.PORT ?? 3001;
  // 0.0.0.0, not localhost. Inside a container, binding to localhost means
  // nothing outside the container can reach it — and the logs look perfect.
  await app.listen(port, "0.0.0.0");

  new Logger("bootstrap").log(`API listening on ${port} in ${process.env.NODE_ENV} mode`);
}

void bootstrap();
