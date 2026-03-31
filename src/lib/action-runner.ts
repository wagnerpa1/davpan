import { DomainError, mapPostgresError } from "./errors";

export interface ActionState<T = any> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    retryable: boolean;
  };
}

/**
 * Wraps a server action to uniformly handle errors and return a standardized ActionState.
 */
export async function runAction<T>(
  action: () => Promise<T>
): Promise<ActionState<T>> {
  try {
    const data = await action();
    return { success: true, data };
  } catch (error: any) {
    console.error("[Action Error]", error);

    // If it's already a DomainError (e.g. manually thrown)
    if (error instanceof DomainError) {
      return {
        success: false,
        error: {
          code: error.code,
          message: error.message,
          retryable: error.retryable,
        },
      };
    }

    // Try mapping standard postgres exceptions
    const domainErr = mapPostgresError(error);
    return {
      success: false,
      error: {
        code: domainErr.code,
        message: domainErr.message,
        retryable: domainErr.retryable,
      },
    };
  }
}
