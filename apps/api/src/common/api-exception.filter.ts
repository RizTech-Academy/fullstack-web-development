import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from "@nestjs/common";
import type { Response } from "express";
import { ErrorCode, type ApiErrorBody } from "@kirana/shared";

import { AppException } from "./app-exception";

/**
 * Every error leaves the API in one shape: `ApiErrorBody`.
 *
 * Without this, a validation failure, a 404 and a crash all look different, and
 * the front end grows a different special case for each. With it, the front end
 * switches on `code` and nothing else.
 */
@Catch()
export class ApiExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(ApiExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const response = host.switchToHttp().getResponse<Response>();

    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    const body: ApiErrorBody = {
      statusCode: status,
      code: this.codeFor(exception, status),
      message: this.messageFor(exception, status),
      ...(exception instanceof AppException && exception.details
        ? { details: exception.details }
        : {}),
    };

    // A 500 is a bug in this codebase, so log the whole thing. A 4xx is the
    // caller's problem and logging every one of them buries the real failures.
    if (status >= HttpStatus.INTERNAL_SERVER_ERROR) {
      this.logger.error(exception);
    }

    response.status(status).json(body);
  }

  private codeFor(exception: unknown, status: number): ErrorCode {
    if (exception instanceof AppException) return exception.code;

    switch (status) {
      case HttpStatus.BAD_REQUEST:
        return ErrorCode.VALIDATION_FAILED;
      case HttpStatus.UNAUTHORIZED:
        return ErrorCode.UNAUTHENTICATED;
      case HttpStatus.FORBIDDEN:
        return ErrorCode.FORBIDDEN;
      case HttpStatus.NOT_FOUND:
        return ErrorCode.NOT_FOUND;
      case HttpStatus.CONFLICT:
        return ErrorCode.ALREADY_EXISTS;
      default:
        return ErrorCode.INTERNAL_ERROR;
    }
  }

  private messageFor(exception: unknown, status: number): string {
    // Never leak an internal message. "Cannot read properties of undefined" in
    // a customer's browser is useless to them and useful to an attacker.
    if (status >= HttpStatus.INTERNAL_SERVER_ERROR) {
      return "Something went wrong at our end. Please try again.";
    }

    if (exception instanceof HttpException) {
      const response = exception.getResponse();
      if (typeof response === "string") return response;

      const message = (response as { message?: unknown }).message;
      // ValidationPipe puts an array here, one entry per failed rule.
      if (Array.isArray(message)) return message.join(". ");
      if (typeof message === "string") return message;
    }

    return "Request failed.";
  }
}
