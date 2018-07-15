import { Readable } from 'stream';

import { Task, pure } from '@jonggrang/task';
import { HttpContext } from '@jonggrang/wai';


/**
 * Files are record of FileInfo with key field name
 */
export type Files = Record<string, FileInfo[]>;

/**
 * The rest of body params that are not files
 */
export type Params = Record<string, any>;

/**
 * Information of uploaded file
 */
export interface FileUpload {
  fieldname: string;
  originalname: string;
  encoding: string;
  mimeType: string;
}

/**
 * Public file uploaded info
 */
export interface FileInfo extends FileUpload {
  move(path: string): Task<void>;
  filename?: string;
  size?: number;
  path?: string;
}

/**
 * The storage backend
 */
export interface Storage {
  handleFile(file: FileUpload, source: Readable): Task<FileInfo>;
  removeFile(file: FileInfo): Task<void>;
}

/**
 * File filter
 */
export interface FileFilter {
  (ctx: HttpContext, file: FileUpload): Task<boolean>;
}

export function defaultFileFilter(): Task<boolean> {
  return pure(true);
}

/**
 * All mutter options
 */
export interface MutterOptions {
  getStorage?: (ctx: HttpContext) => Storage;
  fileFilter?: FileFilter;
  preservePath?: boolean;
  sizeLimit?: string;
  limits?: {
    fieldNameSize?: number;
    fieldSize?: number;
    fields?: number;
    fileSize?: number;
    files?: number;
    parts?: number;
    headerPairs?: number;
  };
}
