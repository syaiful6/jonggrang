import { Choice, left, right } from './utils';

/**
 * HTTP standard method (as defined by RFC 2616, and PATCH which is defined
 * by RFC 5789).
 */
export type HttpMethod
  = 'GET'
  | 'POST'
  | 'HEAD'
  | 'PUT'
  | 'DELETE'
  | 'TRACE'
  | 'CONNECT'
  | 'OPTIONS'
  | 'PATCH';

export function httpMethod(str: string): Choice<string, HttpMethod> {
  switch (str) {
    case 'GET':
    case 'POST':
    case 'HEAD':
    case 'PUT':
    case 'DELETE':
    case 'TRACE':
    case 'CONNECT':
    case 'OPTIONS':
    case 'PATCH':
      return right(<HttpMethod>str);
    default:
      return left(str);
  }
}
