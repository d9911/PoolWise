import { ErrorCode, ErrorCodeValue } from '@/shared/types';

/**
 * Domain error base. Carries a stable `code` that the API layer maps to an HTTP
 * status, and a human-readable message.
 */
export class DomainError extends Error {
  readonly code: ErrorCodeValue;
  readonly status: number;
  readonly details?: unknown;

  constructor(code: ErrorCodeValue, message: string, status: number, details?: unknown) {
    super(message);
    this.name = 'DomainError';
    this.code = code;
    this.status = status;
    if (details !== undefined) this.details = details;
  }
}

export const Errors = {
  validation: (message: string, details?: unknown) =>
    new DomainError(ErrorCode.VALIDATION, message, 400, details),
  notFound: (message: string) => new DomainError(ErrorCode.NOT_FOUND, message, 404),
  insufficientBalance: (available: number, required: number) =>
    new DomainError(
      ErrorCode.INSUFFICIENT_BALANCE,
      'Not enough balance to place this bet.',
      402,
      { availableMinor: available, requiredMinor: required },
    ),
  marketNotOpen: (marketId: string) =>
    new DomainError(ErrorCode.MARKET_NOT_OPEN, `Market ${marketId} is not open.`, 422),
  marketAlreadyResolved: (marketId: string) =>
    new DomainError(
      ErrorCode.MARKET_ALREADY_RESOLVED,
      `Market ${marketId} is already resolved.`,
      409,
    ),
  unprocessable: (message: string, details?: unknown) =>
    new DomainError(ErrorCode.UNPROCESSABLE, message, 422, details),
  internal: (message: string) => new DomainError(ErrorCode.INTERNAL, message, 500),
};

export function isUniqueConstraintError(e: unknown): boolean {
  const code = (e as { code?: string } | undefined)?.code;
  return code === 'P2002';
}
