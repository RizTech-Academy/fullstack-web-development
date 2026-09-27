import { HttpStatus, Injectable } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { Prisma } from "@prisma/client";
import { ErrorCode, normalisePhone, type AuthUser } from "@kirana/shared";

import { AppException } from "../common/app-exception";
import { PrismaService } from "../prisma/prisma.service";
import type { LoginDto } from "./dto/login.dto";
import type { RegisterDto } from "./dto/register.dto";
import { hashPassword, verifyPassword } from "./password";

const PUBLIC_FIELDS = {
  id: true,
  name: true,
  email: true,
  phone: true,
  role: true,
} as const;

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
  ) {}

  async register(dto: RegisterDto): Promise<{ user: AuthUser; token: string }> {
    const phone = dto.phone ? normalisePhone(dto.phone) : null;

    if (dto.phone && !phone) {
      throw new AppException(
        ErrorCode.VALIDATION_FAILED,
        HttpStatus.BAD_REQUEST,
        "That does not look like an Indian mobile number.",
        { field: "phone" },
      );
    }

    try {
      const user = await this.prisma.user.create({
        data: {
          name: dto.name,
          email: dto.email,
          phone,
          passwordHash: await hashPassword(dto.password),
        },
        select: PUBLIC_FIELDS,
      });

      return { user, token: await this.sign(user.id) };
    } catch (error) {
      // Checking for an existing email first and then inserting is a race: two
      // requests both see nothing and both insert. Let the unique index decide
      // and translate its error, which cannot race.
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2002"
      ) {
        throw new AppException(
          ErrorCode.ALREADY_EXISTS,
          HttpStatus.CONFLICT,
          "An account with that email already exists.",
          { field: "email" },
        );
      }
      throw error;
    }
  }

  async login(dto: LoginDto): Promise<{ user: AuthUser; token: string }> {
    const row = await this.prisma.user.findUnique({
      where: { email: dto.email },
      select: { ...PUBLIC_FIELDS, passwordHash: true, isActive: true },
    });

    // One message for "no such email" and "wrong password", because two
    // messages turn the login form into a list of who has an account here.
    const wrong = new AppException(
      ErrorCode.UNAUTHENTICATED,
      HttpStatus.UNAUTHORIZED,
      "Those details do not match an account.",
    );

    if (!row || !row.isActive) throw wrong;

    const { passwordHash, isActive: _isActive, ...user } = row;
    if (!(await verifyPassword(dto.password, passwordHash))) throw wrong;

    return { user, token: await this.sign(user.id) };
  }

  private sign(userId: string): Promise<string> {
    // Nothing but the id. A role baked into a token is a role that keeps
    // working for fifteen minutes after you revoke it.
    return this.jwt.signAsync({ sub: userId });
  }
}
