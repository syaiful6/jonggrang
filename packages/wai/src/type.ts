import * as H from '@jonggrang/http-types';
import { Task } from '@jonggrang/task';


export interface Request {
  // http method, such as GET
  readonly method: H.HttpMethod;
  // Request headers
  readonly headers: H.RequestHeaders;
  // HTTP version such as 1.1
  readonly httpVersion: H.HttpVersion;
  // Extra path information sent by the client.
  readonly rawPathInfo: string;
  // If no query string was specified, this should be empty.
  // This value. Will include the leading question mark.
  readonly rawQueryString: string;
  // Was this request made over an SSL connection?
  readonly isSecure: boolean;
  // Parsed query string information.
  readonly query: H.Query;
  // Path info in individual pieces - the URL without a hostname/port and
  //  without a query string, split on forward slashes.
  readonly pathInfo: string[];
  // Get the next chunk of the body. Returns 'B.empty' when the
  // body is fully consumed.
  readonly body: Task<Buffer>;
  // A location for arbitrary data to be shared by applications and middleware.
  readonly vault: Record<string, any>;
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
  readonly tag: ResponseType.RESPONSEFILE;
  readonly status: H.Status;
  readonly headers: H.ResponseHeaders;
  readonly path: FilePath;
  readonly part?: FilePart;
}

export interface ResponseBuffer {
  readonly tag: ResponseType.RESPONSEBUFFER;
  readonly status: H.Status;
  readonly headers: H.ResponseHeaders;
  readonly buffer: Buffer;
}

export interface ResponseStream {
  readonly tag: ResponseType.RESPONSESTREAM;
  readonly status: H.Status;
  readonly headers: H.ResponseHeaders;
  readonly body: StreamingBody;
}

export interface StreamingBody {
  (send: (b: Buffer) => Task<void>, flush: Task<void>): Task<void>;
}

export interface Application {
  <A>(req: Request, send: (_: Response) => Task<A>): Task<A>;
}

export type Middleware = (app: Application) => Application;
