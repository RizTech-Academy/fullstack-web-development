import { HttpException, HttpStatus } from "@nestjs/common";
import { ErrorCode } from "@kirana/shared";

/**
 * An HttpException that carries a machine-readable code.
 *
 * Nest's built-in exceptions carry only a status and a message. A client that
 * has to tell "out of stock" apart from "delivery slot full" by reading English
 * will break the first time somebody rewords a string — see the module 7 lesson
 * on errors a client can act on.
 */
export class AppException extends HttpException {
  constructor(
    readonly code: ErrorCode,
    status: HttpStatus,
    message: string,
    readonly details?: Record<string, unknown>,
  ) {
    super(message, status);
  }

  static insufficientStock(details: Record<string, unknown>): AppException {
    return new AppException(
      ErrorCode.INSUFFICIENT_STOCK,
      HttpStatus.CONFLICT,
      "Some items are no longer available in the quantity you asked for.",
      details,
    );
  }

  static cartEmpty(): AppException {
    return new AppException(
      ErrorCode.CART_EMPTY,
      HttpStatus.BAD_REQUEST,
      "Your cart is empty.",
    );
  }

  static slotFull(): AppException {
    return new AppException(
      ErrorCode.SLOT_FULL,
      HttpStatus.CONFLICT,
      "That delivery slot has just filled up. Please pick another.",
    );
  }

  static outsideDeliveryArea(pincode: string): AppException {
    return new AppException(
      ErrorCode.OUTSIDE_DELIVERY_AREA,
      HttpStatus.BAD_REQUEST,
      `We do not deliver to ${pincode} yet.`,
      { pincode },
    );
  }

  static notFound(what: string): AppException {
    return new AppException(ErrorCode.NOT_FOUND, HttpStatus.NOT_FOUND, what);
  }

  static unauthenticated(): AppException {
    return new AppException(
      ErrorCode.UNAUTHENTICATED,
      HttpStatus.UNAUTHORIZED,
      "Please sign in to continue.",
    );
  }
}
