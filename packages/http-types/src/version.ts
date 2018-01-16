/**
 * HTTP Version
 */
export class HttpVersion {
  constructor(readonly major: number, readonly minor: number) {
  }

  toString() {
    return `HTTP/${this.major}.${this.minor}`;
  }

  equals(other: HttpVersion) {
    return this.major === other.major && this.minor === other.minor;
  }
}

/**
 * Construct http version
 * 
 * @param major number
 * @param minor number
 */
export function httpVersion(major: number, minor: number) {
  return new HttpVersion(major, minor);
}
