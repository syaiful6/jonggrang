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

export interface Response {
  status: H.Status;
  headers: H.ResponseHeaders;
  content: HttpContent;
}

export interface FilePart {
  offset: number;
  byteCount: number;
  size: number;
}

export const enum ContentType {
  FILE,
  BUFFER,
  STREAM
}

export interface ContentFile {
  tag: ContentType.FILE;
  path: string;
  part?: FilePart;
}

export interface ContentBuffer {
  tag: ContentType.BUFFER;
  buffer: Buffer;
}

export interface ContentStream {
  tag: ContentType.STREAM;
  stream: StreamingBody;
}

export type HttpContent
  = ContentFile
  | ContentBuffer
  | ContentStream;

export type FilePath = string;

export interface StreamingBody {
  (send: (b: Buffer) => Task<void>, flush: Task<void>): Task<void>;
}

export interface Application {
  <A>(req: Request, send: (_: Response) => Task<A>): Task<A>;
}

export type Middleware = (app: Application) => Application;
