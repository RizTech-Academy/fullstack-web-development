import { Controller, Get, HttpCode, HttpStatus, ServiceUnavailableException } from "@nestjs/common";

import { PrismaService } from "../prisma/prisma.service";

@Controller("health")
export class HealthController {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * "Is the process up?" — nothing more.
   *
   * A platform restarts a container that fails its liveness check. If this
   * checked the database, a database blip would restart every API container at
   * once, turning a recoverable problem into an outage — and restarting an API
   * does not fix a database.
   */
  @Get("live")
  @HttpCode(HttpStatus.OK)
  live(): { status: "ok" } {
    return { status: "ok" };
  }

  /**
   * "Should this instance receive traffic?"
   *
   * This one does check the database, because an API that cannot reach
   * PostgreSQL can serve nothing useful. A load balancer takes it out of
   * rotation and puts it back when it recovers — no restart, no data loss.
   *
   * `SELECT 1` and not a real query: it proves the connection works without
   * depending on any table existing.
   */
  @Get("ready")
  async ready(): Promise<{ status: "ok"; database: "ok" }> {
    try {
      await this.prisma.$queryRaw`SELECT 1`;
    } catch {
      // No detail in the response. Health endpoints are unauthenticated, and a
      // connection string in an error body is a connection string on the
      // internet.
      throw new ServiceUnavailableException("Not ready");
    }

    return { status: "ok", database: "ok" };
  }
}
