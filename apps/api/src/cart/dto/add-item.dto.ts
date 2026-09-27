import { Type } from "class-transformer";
import { IsInt, IsString, Length, Max, Min } from "class-validator";
import { MAX_CART_QUANTITY } from "@kirana/shared";

export class AddItemDto {
  // cuid is 25 characters. Bounding it stops a megabyte of junk reaching the
  // database as a query parameter.
  @IsString()
  @Length(20, 40)
  variantId!: string;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(MAX_CART_QUANTITY)
  quantity!: number;
}
