import { Transform } from "class-transformer";
import { IsEmail, IsOptional, IsString, MaxLength, MinLength } from "class-validator";
import { PASSWORD_MIN_LENGTH } from "@kirana/shared";

export class RegisterDto {
  @IsString()
  @MinLength(2)
  @MaxLength(80)
  @Transform(({ value }) => (typeof value === "string" ? value.trim() : value))
  name!: string;

  @IsEmail()
  @MaxLength(160)
  // Stored lowercase. Without this, Rizwan@example.com and rizwan@example.com
  // are two accounts, and the unique index does not stop it.
  @Transform(({ value }) =>
    typeof value === "string" ? value.trim().toLowerCase() : value,
  )
  email!: string;

  /**
   * Length, and nothing else.
   *
   * Composition rules ("one capital, one symbol") push people towards
   * Password1! and are worse than a longer passphrase. See the module 8 lesson.
   */
  @IsString()
  @MinLength(PASSWORD_MIN_LENGTH)
  @MaxLength(200)
  password!: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  phone?: string;
}
