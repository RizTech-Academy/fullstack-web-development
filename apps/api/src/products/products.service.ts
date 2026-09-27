import { Injectable, NotFoundException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import {
  DEFAULT_PAGE_SIZE,
  MAX_PAGE_SIZE,
  type Paginated,
  type ProductDetail,
  type ProductSummary,
} from "@kirana/shared";

import { PrismaService } from "../prisma/prisma.service";
import { QueryProductsDto, type ProductSort } from "./dto/query-products.dto";
import { toProductDetail, toProductSummary } from "./product.mapper";

const WITH_RELATIONS = { category: true, variants: true } as const;
const MAX_SEARCH_TERMS = 5;

@Injectable()
export class ProductsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(query: QueryProductsDto): Promise<Paginated<ProductSummary>> {
    const page = Math.max(1, query.page ?? 1);
    const limit = Math.min(
      MAX_PAGE_SIZE,
      Math.max(1, query.limit ?? DEFAULT_PAGE_SIZE),
    );
    const where = this.buildWhere(query);

    const [rows, total] = await this.prisma.$transaction([
      this.prisma.product.findMany({
        where,
        include: WITH_RELATIONS,
        orderBy: this.buildOrderBy(query.sort),
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.product.count({ where }),
    ]);

    const totalPages = Math.max(1, Math.ceil(total / limit));

    return {
      items: rows.map(toProductSummary),
      page,
      limit,
      total,
      totalPages,
      hasNext: page < totalPages,
      hasPrevious: page > 1,
    };
  }

  async findBySlug(slug: string): Promise<ProductDetail> {
    const row = await this.prisma.product.findFirst({
      where: { slug, isActive: true },
      include: WITH_RELATIONS,
    });

    if (!row || !row.variants.some((v) => v.isActive)) {
      throw new NotFoundException(`No product with slug "${slug}"`);
    }

    return toProductDetail(row);
  }

  private buildWhere(query: QueryProductsDto): Prisma.ProductWhereInput {
    // Not optional, so not conditional.
    const where: Prisma.ProductWhereInput = { isActive: true };

    if (query.category) {
      where.category = { slug: query.category };
    }

    const search = query.q?.trim();
    if (search) {
      // Every term must match somewhere, so "toor dal" finds the product.
      const terms = search.split(/\s+/).slice(0, MAX_SEARCH_TERMS);
      where.AND = terms.map((term) => ({
        OR: [
          { name: { contains: term, mode: "insensitive" } },
          { brand: { contains: term, mode: "insensitive" } },
          { description: { contains: term, mode: "insensitive" } },
        ],
      }));
    }

    const variant: Prisma.VariantWhereInput = { isActive: true };

    if (query.minPaise !== undefined || query.maxPaise !== undefined) {
      variant.pricePaise = {
        ...(query.minPaise !== undefined ? { gte: query.minPaise } : {}),
        ...(query.maxPaise !== undefined ? { lte: query.maxPaise } : {}),
      };
    }

    if (query.inStock) {
      variant.stock = { gt: 0 };
    }

    // Excludes products whose variants are all inactive, which would
    // otherwise render with no price.
    where.variants = { some: variant };

    return where;
  }

  private buildOrderBy(
    sort?: ProductSort,
  ): Prisma.ProductOrderByWithRelationInput[] {
    // Every ordering ends with a unique tiebreaker, or rows with equal values
    // have no defined order and can repeat across pages.
    switch (sort) {
      case "newest":
        return [{ createdAt: "desc" }, { id: "asc" }];
      case "name_desc":
        return [{ name: "desc" }, { id: "asc" }];
      default:
        return [{ name: "asc" }, { id: "asc" }];
    }
  }
}
