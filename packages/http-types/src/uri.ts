import { qsUnescape, qsEscape } from './querystring';

/**
 * Parse a list of path segments from a valid URL fragment.
 */
export function decodePathSegments(path: string): string[] {
  if (path === '' || path === '/') return [];
  if (path.charCodeAt(0) === 47) path = path.substring(1);
  return path.split('/').map(decodePathSegment);
}

/**
 * Encodes a list of path segments into a valid URL fragment.
 */
export function encodePathSegments(segments: string[]): string {
  return segments.reduce((prev, current) => prev + '/' + qsEscape(current), '');
}

function decodePathSegment(str: string): string {
  return qsUnescape(str);
}
