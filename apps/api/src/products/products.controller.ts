import { Controller, Get, Param, Query } from "@nestjs/common";
import { ProductsService } from "./products.service";
import { QueryProductsDto } from "./dto/query-products.dto";

@Controller("products")
export class ProductsController {
  constructor(private readonly products: ProductsService) {}

  @Get()
  findAll(@Query() query: QueryProductsDto) {
    return this.products.findAll(query);
  }

  // Any fixed path must be declared above this, or it is read as a slug.
  @Get(":slug")
  findOne(@Param("slug") slug: string) {
    return this.products.findBySlug(slug);
  }
}
