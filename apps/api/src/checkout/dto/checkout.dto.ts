import { Transform } from "class-transformer";
import {
  IsIn,
  IsISO8601,
  IsOptional,
  IsString,
  Length,
  Matches,
  MaxLength,
  MinLength,
} from "class-validator";
import { PINCODE_PATTERN } from "@kirana/shared";

const PAYMENT_METHODS = ["ONLINE", "CASH_ON_DELIVERY"] as const;

export class CheckoutDto {
  @IsString()
  @MinLength(2)
  @MaxLength(80)
  @Transform(({ value }) => (typeof value === "string" ? value.trim() : value))
  name!: string;

  @IsString()
  @MaxLength(20)
  phone!: string;

  @IsString()
  @MinLength(5)
  @MaxLength(160)
  @Transform(({ value }) => (typeof value === "string" ? value.trim() : value))
  line1!: string;

  @IsOptional()
  @IsString()
  @MaxLength(160)
  line2?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  landmark?: string;

  @IsString()
  @MaxLength(60)
  city!: string;

  // Shape only. Whether the shop delivers there is a separate check, because
  // "not a pincode" and "not our area" are different messages.
  @IsString()
  @Matches(PINCODE_PATTERN, { message: "pincode must be six digits" })
  pincode!: string;

  @IsString()
  @Length(20, 40)
  slotId!: string;

  // "2026-09-28". A full timestamp would carry a timezone, and a delivery slot
  // on the 28th in IST must not become the 27th because a server is in UTC.
  @IsISO8601({ strict: true })
  slotDate!: string;

  @IsIn(PAYMENT_METHODS)
  paymentMethod!: (typeof PAYMENT_METHODS)[number];

  @IsOptional()
  @IsString()
  @MaxLength(60)
  saveAddressLabel?: string;
}
