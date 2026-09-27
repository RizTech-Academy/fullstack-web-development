import { HttpStatus, Injectable } from "@nestjs/common";
import {
  DEFAULT_PAGE_SIZE,
  ErrorCode,
  LOW_STOCK_THRESHOLD,
  utcIsoDate,
  type AdminOrderSummary,
  type AdminStats,
  type AdminVariantRow,
  type Paginated,
} from "@kirana/shared";

import { AppException } from "../common/app-exception";
import { PrismaService } from "../prisma/prisma.service";
import type { QueryAdminOrdersDto, UpdateVariantDto } from "./dto/admin.dto";

/** Statuses the shop still has to act on. */
const OPEN_STATUSES = ["PENDING_PAYMENT", "PLACED", "PACKED", "OUT_FOR_DELIVERY"] as const;

@Injectable()
export class AdminService {
  constructor(private readonly prisma: PrismaService) {}

  async orders(query: QueryAdminOrdersDto): Promise<Paginated<AdminOrderSummary>> {
    const page = Math.max(1, query.page ?? 1);
    const limit = DEFAULT_PAGE_SIZE;
    const where = query.status ? { status: query.status } : {};

    const [rows, total] = await this.prisma.$transaction([
      this.prisma.order.findMany({
        where,
        // `select`, not `include`. The admin list needs eight fields per order
        // and there is no reason to pull every address line and every order
        // item across the wire to render a table.
        select: {
          orderNumber: true,
          status: true,
          paymentMethod: true,
          deliveryName: true,
          deliveryPhone: true,
          deliveryPincode: true,
          totalPaise: true,
          slotDate: true,
          slotLabel: true,
          createdAt: true,
          _count: { select: { items: true } },
        },
        orderBy: [{ createdAt: "desc" }, { orderNumber: "desc" }],
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.order.count({ where }),
    ]);

    const totalPages = Math.max(1, Math.ceil(total / limit));

    return {
      items: rows.map((row) => ({
        orderNumber: row.orderNumber,
        status: row.status,
        paymentMethod: row.paymentMethod,
        customerName: row.deliveryName,
        customerPhone: row.deliveryPhone,
        pincode: row.deliveryPincode,
        totalPaise: row.totalPaise,
        itemCount: row._count.items,
        slotDate: row.slotDate ? utcIsoDate(row.slotDate) : null,
        slotLabel: row.slotLabel,
        createdAt: row.createdAt.toISOString(),
      })),
      page,
      limit,
      total,
      totalPages,
      hasNext: page < totalPages,
      hasPrevious: page > 1,
    };
  }

  async stats(now = new Date()): Promise<AdminStats> {
    const startOfToday = new Date(now);
    startOfToday.setHours(0, 0, 0, 0);

    // One round trip for five numbers. Five awaits on their own lines would be
    // five times the latency for no benefit — nothing here depends on anything
    // else here.
    const [openOrders, ordersToday, revenue, lowStock, outOfStock] =
      await this.prisma.$transaction([
        this.prisma.order.count({ where: { status: { in: [...OPEN_STATUSES] } } }),
        this.prisma.order.count({ where: { createdAt: { gte: startOfToday } } }),
        this.prisma.order.aggregate({
          _sum: { totalPaise: true },
          // Cancelled orders are not revenue. Counting them makes the number
          // flattering and useless.
          where: { createdAt: { gte: startOfToday }, status: { not: "CANCELLED" } },
        }),
        this.prisma.variant.count({
          where: { isActive: true, stock: { gt: 0, lte: LOW_STOCK_THRESHOLD } },
        }),
        this.prisma.variant.count({ where: { isActive: true, stock: 0 } }),
      ]);

    return {
      openOrders,
      ordersToday,
      // `_sum` is null when nothing matched, not 0.
      revenueTodayPaise: revenue._sum.totalPaise ?? 0,
      lowStock,
      outOfStock,
    };
  }

  async inventory(): Promise<AdminVariantRow[]> {
    const rows = await this.prisma.variant.findMany({
      include: { product: true },
      // Out of stock first, then low, then the rest. The page exists to answer
      // "what do I need to reorder?", so it opens on the answer.
      orderBy: [{ stock: "asc" }, { sku: "asc" }],
    });

    return rows.map((row) => ({
      id: row.id,
      sku: row.sku,
      productName: row.product.name,
      productSlug: row.product.slug,
      variantLabel: row.label,
      pricePaise: row.pricePaise,
      mrpPaise: row.mrpPaise,
      stock: row.stock,
      isActive: row.isActive,
      productIsActive: row.product.isActive,
    }));
  }

  async updateVariant(id: string, dto: UpdateVariantDto): Promise<AdminVariantRow> {
    // `Object.keys(dto).length` is not zero for an empty body, which is a good
    // thing to learn here rather than in production. class-transformer builds a
    // real instance of the DTO class, so every declared property exists — the
    // optional ones simply hold `undefined`. Count the defined ones.
    const changes = Object.entries(dto).filter(([, value]) => value !== undefined);

    if (changes.length === 0) {
      throw new AppException(
        ErrorCode.VALIDATION_FAILED,
        HttpStatus.BAD_REQUEST,
        "Nothing to change.",
      );
    }

    const existing = await this.prisma.variant.findUnique({ where: { id } });
    if (!existing) throw AppException.notFound("No such item.");

    const pricePaise = dto.pricePaise ?? existing.pricePaise;
    const mrpPaise = dto.mrpPaise ?? existing.mrpPaise;

    // An MRP at or below the price renders as "₹285, was ₹285", or worse as a
    // negative discount. Refuse it here rather than teaching the interface to
    // hide it.
    if (mrpPaise !== null && mrpPaise > 0 && mrpPaise <= pricePaise) {
      throw new AppException(
        ErrorCode.VALIDATION_FAILED,
        HttpStatus.BAD_REQUEST,
        "The MRP must be higher than the price, or left empty.",
        { field: "mrpPaise" },
      );
    }

    const row = await this.prisma.variant.update({
      where: { id },
      data: {
        ...(dto.pricePaise !== undefined ? { pricePaise: dto.pricePaise } : {}),
        // A direct set, not an increment: this is the shopkeeper counting the
        // shelf, which is the truth. Selling is what increments and decrements.
        ...(dto.stock !== undefined ? { stock: dto.stock } : {}),
        ...(dto.mrpPaise !== undefined ? { mrpPaise: dto.mrpPaise || null } : {}),
        ...(dto.isActive !== undefined ? { isActive: dto.isActive } : {}),
      },
      include: { product: true },
    });

    return {
      id: row.id,
      sku: row.sku,
      productName: row.product.name,
      productSlug: row.product.slug,
      variantLabel: row.label,
      pricePaise: row.pricePaise,
      mrpPaise: row.mrpPaise,
      stock: row.stock,
      isActive: row.isActive,
      productIsActive: row.product.isActive,
    };
  }
}
