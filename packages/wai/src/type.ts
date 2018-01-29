import * as H from '@jonggrang/http-types';
import { Task } from '@jonggrang/task';

export interface Request {
  method: H.HttpMethod; // http method, such as GET
  headers: H.RequestHeaders; // Request headers
  httpVersion: H.HttpVersion; // HTTP version such as 1.1
  rawPathInfo: string;
  rawQueryString: string;
  query: H.Query;
  pathInfo: string[];
  body: Task<Buffer>;
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
