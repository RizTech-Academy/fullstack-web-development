import { Body, Controller, Get, Param, Patch, Query, UseGuards } from "@nestjs/common";
import type {
  AdminOrderSummary,
  AdminStats,
  AdminVariantRow,
  AuthUser,
  OrderDetail,
  Paginated,
} from "@kirana/shared";

import { CurrentUser } from "../auth/current-user.decorator";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { Roles, RolesGuard } from "../auth/roles.guard";
import { OrdersService } from "../orders/orders.service";
import { AdminService } from "./admin.service";
import {
  QueryAdminOrdersDto,
  UpdateOrderStatusDto,
  UpdateVariantDto,
} from "./dto/admin.dto";

@Controller("admin")
// Both guards, in this order: authenticate, then authorise. RolesGuard needs a
// user to check a role on, so a missing JwtAuthGuard here would turn a signed
// -out request into a confusing 403 instead of a 401.
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles("ADMIN")
export class AdminController {
  constructor(
    private readonly admin: AdminService,
    private readonly orders: OrdersService,
  ) {}

  @Get("stats")
  stats(): Promise<AdminStats> {
    return this.admin.stats();
  }

  @Get("orders")
  findOrders(
    @Query() query: QueryAdminOrdersDto,
  ): Promise<Paginated<AdminOrderSummary>> {
    return this.admin.orders(query);
  }

  @Patch("orders/:orderNumber/status")
  updateStatus(
    @Param("orderNumber") orderNumber: string,
    @Body() dto: UpdateOrderStatusDto,
    @CurrentUser() user?: AuthUser,
  ): Promise<OrderDetail> {
    // Through OrdersService, so the shop and the customer go through the same
    // state machine and the same stock release.
    return this.orders.setStatus(orderNumber, dto.status, {
      note: dto.note,
      byUserId: user?.id,
    });
  }

  @Get("inventory")
  inventory(): Promise<AdminVariantRow[]> {
    return this.admin.inventory();
  }

  @Patch("variants/:id")
  updateVariant(
    @Param("id") id: string,
    @Body() dto: UpdateVariantDto,
  ): Promise<AdminVariantRow> {
    return this.admin.updateVariant(id, dto);
  }
}
