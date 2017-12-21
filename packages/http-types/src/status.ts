export class Status {
  constructor(readonly code: number, readonly reasonPhrase: string) {
  }

  /**
   * Compare only the status code
   * @param other Status
   */
  equals(other: Status) {
    return this.code === other.code;
  }
}

export function httpStatus(code: number, reasonPhrase: string): Status {
  return new Status(code, reasonPhrase);
}

/**
 * Informational class
 * @param status Status
 */
export function isInformational(status: Status): boolean {
  return status.code >= 100 && status.code < 200;
}

/**
 * Successful class
 * @param status Status
 */
export function isSuccessful(status: Status): boolean {
  return status.code >= 200 && status.code < 300;
}

/**
 * Redirection class
 * @param status Status
 */
export function isRedirection(status: Status): boolean {
  return status.code >= 300 && status.code < 400;
}

/**
 * Redirection class
 * @param status Status
 */
export function isClientError(status: Status): boolean {
  return status.code >= 400 && status.code < 500;
}

/**
 * Redirection class
 * @param status Status
 */
export function isServerError(status: Status): boolean {
  return status.code >= 500 && status.code < 600;
}
