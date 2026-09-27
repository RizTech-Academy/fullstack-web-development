import { Injectable } from "@nestjs/common";
import type { CategoryOption } from "@kirana/shared";
import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class CategoriesService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(): Promise<CategoryOption[]> {
    const rows = await this.prisma.category.findMany({
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
      select: {
        slug: true,
        name: true,
        _count: {
          select: {
            products: {
              where: { isActive: true, variants: { some: { isActive: true } } },
            },
          },
        },
      },
    });

    return rows
      .map((row) => ({
        slug: row.slug,
        name: row.name,
        productCount: row._count.products,
      }))
      // A filter that promises results and gives none is worse than no filter.
      .filter((category) => category.productCount > 0);
  }
}
