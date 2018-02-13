export type Status
  = 100 | 101 | 102 | 103
  | 200 | 201 | 202 | 203 | 204 | 205 | 206 | 207 | 208 | 226
  | 300 | 301 | 302 | 303 | 304 | 305 | 306 | 307 | 308
  | 400 | 401 | 402 | 403 | 404 | 405 | 406 | 407 | 408 | 409
  | 410 | 411 | 412 | 413 | 414 | 415 | 416 | 417 | 418
  | 421 | 422 | 423 | 424 | 425 | 426 | 429 | 431 | 451
  | 500 | 501 | 502 | 504 | 505 | 506 | 507 | 508 | 509 | 510 | 511;

/**
 * Informational class
 * @param status Status
 */
export function isInformational(status: Status): boolean {
  return status >= 100 && status < 200;
}

/**
 * Successful class
 * @param status Status
 */
export function isSuccessful(status: Status): boolean {
  return status >= 200 && status < 300;
}

/**
 * Redirection class
 * @param status Status
 */
export function isRedirection(status: Status): boolean {
  return status >= 300 && status < 400;
}

/**
 * Redirection class
 * @param status Status
 */
export function isClientError(status: Status): boolean {
  return status >= 400 && status < 500;
}

/**
 * Redirection class
 * @param status Status
 */
export function isServerError(status: Status): boolean {
  return status >= 500 && status < 600;
}
