import { Transform } from "class-transformer";
import { IsEmail, IsString, MaxLength } from "class-validator";

export class LoginDto {
  @IsEmail()
  @MaxLength(160)
  @Transform(({ value }) =>
    typeof value === "string" ? value.trim().toLowerCase() : value,
  )
  email!: string;

  // No MinLength here. Rejecting a short password on login tells an attacker
  // the rules and helps nobody; a wrong password is a wrong password.
  @IsString()
  @MaxLength(200)
  password!: string;
}
