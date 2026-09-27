import { ValidationPipe } from "@nestjs/common";
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
    origin: process.env.CORS_ORIGIN ?? "http://localhost:3000",
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

  await app.listen(process.env.PORT ?? 3001);
}

void bootstrap();
