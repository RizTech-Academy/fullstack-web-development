import {
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Query,
  UseGuards,
} from "@nestjs/common";
import { Type } from "class-transformer";
import { IsInt, IsOptional, Min } from "class-validator";
import type { AuthUser, OrderDetail, OrderSummary, Paginated } from "@kirana/shared";

import { CurrentUser } from "../auth/current-user.decorator";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { OrdersService } from "./orders.service";

class QueryOrdersDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;
}

@Controller("orders")
// On the controller, not on each method. A guard repeated per route is a guard
// that will be missing from the route somebody adds in six months.
@UseGuards(JwtAuthGuard)
export class OrdersController {
  constructor(private readonly orders: OrdersService) {}

  @Get()
  findAll(
    @Query() query: QueryOrdersDto,
    @CurrentUser() user?: AuthUser,
  ): Promise<Paginated<OrderSummary>> {
    return this.orders.findForUser((user as AuthUser).id, query.page ?? 1);
  }

  @Get(":orderNumber")
  findOne(
    @Param("orderNumber") orderNumber: string,
    @CurrentUser() user?: AuthUser,
  ): Promise<OrderDetail> {
    return this.orders.findOneForUser((user as AuthUser).id, orderNumber);
  }

  // POST, not DELETE. Cancelling does not remove the order — it moves it to a
  // status the shop still has to see, report on and keep.
  @Post(":orderNumber/cancel")
  @HttpCode(HttpStatus.OK)
  cancel(
    @Param("orderNumber") orderNumber: string,
    @CurrentUser() user?: AuthUser,
  ): Promise<OrderDetail> {
    return this.orders.cancelForUser((user as AuthUser).id, orderNumber);
  }
}
