import { HttpStatus, Injectable } from "@nestjs/common";
import { ErrorCode, MAX_CART_QUANTITY, type CartView } from "@kirana/shared";

import { AppException } from "../common/app-exception";
import { PrismaService } from "../prisma/prisma.service";
import { toCartView, type CartRow } from "./cart.mapper";

const WITH_ITEMS = {
  items: { include: { variant: { include: { product: true } } } },
} as const;

/** Who the cart belongs to: a signed-in user, or an anonymous cookie token. */
export type CartOwner =
  | { kind: "user"; userId: string }
  | { kind: "session"; token: string };

@Injectable()
export class CartService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Reads without creating.
   *
   * A GET that creates a row means every crawler that touches the storefront
   * leaves an empty cart behind — thousands of them, and every one a row
   * somebody has to clean up later.
   */
  async view(owner: CartOwner): Promise<CartView> {
    const row = await this.find(owner);
    return toCartView(row);
  }

  async addItem(
    owner: CartOwner,
    variantId: string,
    quantity: number,
  ): Promise<CartView> {
    const variant = await this.prisma.variant.findFirst({
      where: { id: variantId, isActive: true, product: { isActive: true } },
      select: { id: true, stock: true, label: true, product: { select: { name: true } } },
    });

    if (!variant) throw AppException.notFound("That item is not for sale.");

    const cart = await this.findOrCreate(owner);
    const existing = await this.prisma.cartItem.findUnique({
      where: { cartId_variantId: { cartId: cart.id, variantId } },
      select: { quantity: true },
    });

    // Adding the same thing twice increases the line rather than creating a
    // second one. The unique index on (cartId, variantId) makes that the only
    // possible behaviour, which is the point of having it.
    const wanted = (existing?.quantity ?? 0) + quantity;

    if (wanted > MAX_CART_QUANTITY) {
      throw new AppException(
        ErrorCode.VALIDATION_FAILED,
        HttpStatus.BAD_REQUEST,
        `You can order at most ${MAX_CART_QUANTITY} of one item. Call the shop for a bulk order.`,
        { variantId, max: MAX_CART_QUANTITY },
      );
    }

    if (wanted > variant.stock) {
      throw AppException.insufficientStock({
        variantId,
        available: variant.stock,
        requested: wanted,
      });
    }

    await this.prisma.cartItem.upsert({
      where: { cartId_variantId: { cartId: cart.id, variantId } },
      create: { cartId: cart.id, variantId, quantity },
      update: { quantity: wanted },
    });

    return this.view(owner);
  }

  async setQuantity(
    owner: CartOwner,
    variantId: string,
    quantity: number,
  ): Promise<CartView> {
    const cart = await this.find(owner);
    if (!cart) throw AppException.notFound("You have no cart.");

    if (quantity === 0) {
      // deleteMany, not delete: delete throws if the row has already gone, and
      // two taps on minus arriving out of order is normal on a phone.
      await this.prisma.cartItem.deleteMany({ where: { cartId: cart.id, variantId } });
      return this.view(owner);
    }

    const variant = await this.prisma.variant.findFirst({
      where: { id: variantId, isActive: true, product: { isActive: true } },
      select: { stock: true },
    });

    if (!variant) throw AppException.notFound("That item is not for sale.");

    if (quantity > variant.stock) {
      throw AppException.insufficientStock({
        variantId,
        available: variant.stock,
        requested: quantity,
      });
    }

    const updated = await this.prisma.cartItem.updateMany({
      where: { cartId: cart.id, variantId },
      data: { quantity },
    });

    if (updated.count === 0) {
      throw AppException.notFound("That item is not in your cart.");
    }

    return this.view(owner);
  }

  async clear(owner: CartOwner): Promise<CartView> {
    const cart = await this.find(owner);
    if (cart) {
      await this.prisma.cartItem.deleteMany({ where: { cartId: cart.id } });
    }
    return this.view(owner);
  }

  /**
   * Moves an anonymous cart into the signed-in user's cart.
   *
   * Quantities are added, then capped — at the per-item limit and at stock —
   * because the anonymous cart and the account cart may both hold the same
   * item. Dropping one of them silently is worse than showing a cart the
   * customer then trims.
   */
  async mergeIntoUserCart(anonymousToken: string, userId: string): Promise<void> {
    const anonymous = await this.prisma.cart.findUnique({
      where: { sessionId: anonymousToken },
      include: WITH_ITEMS,
    });

    if (!anonymous || anonymous.items.length === 0) {
      // Nothing to move. Still delete the empty shell if there is one.
      if (anonymous) {
        await this.prisma.cart.delete({ where: { id: anonymous.id } });
      }
      return;
    }

    const target = await this.findOrCreate({ kind: "user", userId });

    for (const item of anonymous.items) {
      const existing = await this.prisma.cartItem.findUnique({
        where: { cartId_variantId: { cartId: target.id, variantId: item.variantId } },
        select: { quantity: true },
      });

      const combined = (existing?.quantity ?? 0) + item.quantity;
      const capped = Math.min(combined, MAX_CART_QUANTITY, item.variant.stock);

      if (capped <= 0) continue;

      await this.prisma.cartItem.upsert({
        where: { cartId_variantId: { cartId: target.id, variantId: item.variantId } },
        create: { cartId: target.id, variantId: item.variantId, quantity: capped },
        update: { quantity: capped },
      });
    }

    // Deleting the anonymous cart cascades to its items, and frees the unique
    // sessionId so the token cannot be reused.
    await this.prisma.cart.delete({ where: { id: anonymous.id } });
  }

  private find(owner: CartOwner): Promise<CartRow | null> {
    return owner.kind === "user"
      ? this.prisma.cart.findFirst({
          where: { userId: owner.userId },
          include: WITH_ITEMS,
          orderBy: { createdAt: "asc" },
        })
      : this.prisma.cart.findUnique({
          where: { sessionId: owner.token },
          include: WITH_ITEMS,
        });
  }

  private async findOrCreate(owner: CartOwner): Promise<{ id: string }> {
    const existing = await this.find(owner);
    if (existing) return existing;

    return this.prisma.cart.create({
      data:
        owner.kind === "user"
          ? { userId: owner.userId }
          : { sessionId: owner.token },
      select: { id: true },
    });
  }
}
