import * as H from '@jonggrang/http-types';
import { Task } from '@jonggrang/task';

export interface Request {
  // http method, such as GET
  method: H.HttpMethod;
  // Request headers
  headers: H.RequestHeaders;
  // HTTP version such as 1.1
  httpVersion: H.HttpVersion;
  // Extra path information sent by the client.
  rawPathInfo: string;
  // If no query string was specified, this should be empty.
  // This value. Will include the leading question mark.
  rawQueryString: string;
  // Was this request made over an SSL connection?
  isSecure: boolean;
  // Parsed query string information.
  query: H.Query;
  // Path info in individual pieces - the URL without a hostname/port and
  //  without a query string, split on forward slashes.
  pathInfo: string[];
  // Get the next chunk of the body. Returns 'B.empty' when the
  // body is fully consumed.
  body: Task<Buffer>;
  // A location for arbitrary data to be shared by applications and middleware.
  vault: Record<string, any>;
}

export type Response
  = ResponseFile
  | ResponseBuffer
  | ResponseStream;

export interface FilePart {
  offset: number;
  byteCount: number;
  size: number;
}

export const enum ResponseType {
  RESPONSEFILE,
  RESPONSEBUFFER,
  RESPONSESTREAM
}

export type FilePath = string;

export interface ResponseFile {
  tag: ResponseType.RESPONSEFILE;
  status: H.Status;
  headers: H.ResponseHeaders;
  path: FilePath;
  part?: FilePart;
}

export interface ResponseBuffer {
  tag: ResponseType.RESPONSEBUFFER;
  status: H.Status;
  headers: H.ResponseHeaders;
  buffer: Buffer;
}

export interface ResponseStream {
  tag: ResponseType.RESPONSESTREAM;
  status: H.Status;
  headers: H.ResponseHeaders;
  body: StreamingBody;
}

export interface StreamingBody {
  (send: (b: Buffer) => Task<void>, flush: Task<void>): Task<void>;
}

export interface Application {
  <A>(req: Request, send: (_: Response) => Task<A>): Task<A>;
}

export type Middleware = (app: Application) => Application;
