import { Transform, Type } from "class-transformer";
import {
  IsBoolean,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from "class-validator";
import { ORDER_STATUS_FLOW, type OrderStatus } from "@kirana/shared";

const STATUSES = Object.keys(ORDER_STATUS_FLOW) as OrderStatus[];

export class QueryAdminOrdersDto {
  @IsOptional()
  @IsIn(STATUSES)
  status?: OrderStatus;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;
}

export class UpdateOrderStatusDto {
  @IsIn(STATUSES)
  status!: OrderStatus;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  note?: string;
}

export class UpdateVariantDto {
  /**
   * Every field optional, because the shop edits one thing at a time. The
   * service rejects a body with nothing in it rather than doing a silent no-op.
   */
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  // A price of zero is not a free gift, it is a typo. One lakh rupees for one
  // item is also a typo, and it is the one that costs the shop money.
  @Min(100)
  @Max(10_000_000)
  pricePaise?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(100_000)
  stock?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(10_000_000)
  mrpPaise?: number;

  @IsOptional()
  @Transform(({ value }) => value === true || value === "true")
  @IsBoolean()
  isActive?: boolean;
}
