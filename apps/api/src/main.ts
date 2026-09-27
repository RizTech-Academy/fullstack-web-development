import { ValidationPipe } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module";

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule);

  app.setGlobalPrefix("api");

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

  await app.listen(process.env.PORT ?? 3001);
}

void bootstrap();
