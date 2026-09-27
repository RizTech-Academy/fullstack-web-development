import { ValidationPipe } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import type { INestApplication } from "@nestjs/common";
import cookieParser from "cookie-parser";

import { AppModule } from "../src/app.module";
import { ApiExceptionFilter } from "../src/common/api-exception.filter";
import { PrismaService } from "../src/prisma/prisma.service";

/**
 * Boots the real application, with the real database.
 *
 * Everything here mirrors `main.ts` — the global prefix, the validation pipe,
 * the cookie parser, the exception filter, `rawBody`. That duplication is the
 * point of the file: if a test sets up a *different* application from the one
 * that ships, it proves nothing about the one that ships.
 *
 * When `main.ts` changes, this changes. If that starts to hurt, move the
 * configuration into a function both call.
 */
export async function createTestApp(): Promise<{
  app: INestApplication;
  prisma: PrismaService;
}> {
  const moduleRef = await Test.createTestingModule({
    imports: [AppModule],
  }).compile();

  const app = moduleRef.createNestApplication({ rawBody: true });

  app.setGlobalPrefix("api");
  app.use(cookieParser());
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );
  app.useGlobalFilters(new ApiExceptionFilter());

  await app.init();

  return { app, prisma: app.get(PrismaService) };
}

/** The cookies a response set, in a form the next request can send back. */
export function cookiesFrom(response: { headers: Record<string, unknown> }): string {
  const header = response.headers["set-cookie"];
  const list = Array.isArray(header) ? header : header ? [String(header)] : [];
  // Only the name=value part. Path, HttpOnly and the rest are instructions to
  // a browser, not something a client sends back.
  return list.map((cookie) => String(cookie).split(";")[0]).join("; ");
}
