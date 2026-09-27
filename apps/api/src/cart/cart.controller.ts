import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Req,
  Res,
} from "@nestjs/common";
import type { Request, Response } from "express";
import { EMPTY_CART, type AuthUser, type CartView } from "@kirana/shared";

import { CurrentUser } from "../auth/current-user.decorator";
import { newCartToken, readCartCookie, setCartCookie } from "./cart-cookie";
import { CartService, type CartOwner } from "./cart.service";
import { AddItemDto } from "./dto/add-item.dto";
import { UpdateItemDto } from "./dto/update-item.dto";

@Controller("cart")
export class CartController {
  constructor(private readonly cart: CartService) {}

  @Get()
  async view(
    @Req() request: Request,
    @CurrentUser() user?: AuthUser,
  ): Promise<CartView> {
    const owner = this.readOwner(request, user);
    // No user and no cookie means nothing has ever been added. Answer with an
    // empty cart rather than minting a token on a read.
    if (!owner) return EMPTY_CART;
    return this.cart.view(owner);
  }

  @Post("items")
  async addItem(
    @Body() dto: AddItemDto,
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
    @CurrentUser() user?: AuthUser,
  ): Promise<CartView> {
    const owner = this.ownerForWrite(request, response, user);
    return this.cart.addItem(owner, dto.variantId, dto.quantity);
  }

  @Patch("items/:variantId")
  async setQuantity(
    @Param("variantId") variantId: string,
    @Body() dto: UpdateItemDto,
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
    @CurrentUser() user?: AuthUser,
  ): Promise<CartView> {
    const owner = this.ownerForWrite(request, response, user);
    return this.cart.setQuantity(owner, variantId, dto.quantity);
  }

  @Delete("items/:variantId")
  async removeItem(
    @Param("variantId") variantId: string,
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
    @CurrentUser() user?: AuthUser,
  ): Promise<CartView> {
    const owner = this.ownerForWrite(request, response, user);
    return this.cart.setQuantity(owner, variantId, 0);
  }

  @Delete()
  async clear(
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
    @CurrentUser() user?: AuthUser,
  ): Promise<CartView> {
    const owner = this.ownerForWrite(request, response, user);
    return this.cart.clear(owner);
  }

  /** A signed-in user's cart always wins over whatever cookie is lying about. */
  private readOwner(request: Request, user?: AuthUser): CartOwner | null {
    if (user) return { kind: "user", userId: user.id };

    const token = readCartCookie(request);
    return token ? { kind: "session", token } : null;
  }

  /**
   * A write may need to mint the cookie, which is why only writes take a
   * `Response`. Doing it in one helper is what keeps "GET never creates" true.
   */
  private ownerForWrite(
    request: Request,
    response: Response,
    user?: AuthUser,
  ): CartOwner {
    const existing = this.readOwner(request, user);
    if (existing) return existing;

    const token = newCartToken();
    setCartCookie(response, token);
    return { kind: "session", token };
  }
}
