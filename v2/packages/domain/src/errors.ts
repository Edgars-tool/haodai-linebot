import type { ActionError } from "@haodai/action-contracts";

export class DomainError extends Error {
  readonly code: ActionError["code"];
  readonly details?: Record<string, unknown>;

  constructor(
    code: ActionError["code"],
    message: string,
    details?: Record<string, unknown>,
  ) {
    super(message);
    this.name = "DomainError";
    this.code = code;
    this.details = details;
  }

  toActionError(): ActionError {
    return {
      code: this.code,
      message: this.message,
      details: this.details,
    };
  }
}

export function isDomainError(err: unknown): err is DomainError {
  return err instanceof DomainError;
}
