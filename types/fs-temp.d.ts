/// <reference types="node" />
export = FsTemp;
import { WriteStream } from 'fs';

declare namespace FsTemp {
  interface Callback<T> {
    (err: Error | null | undefined, value: T): void;
  }

  interface FsTemFd {
    path: string;
    fd: number;
  }

  interface TempWriteStream extends WriteStream {
    on(event: 'path', listener: (path: string) => void): this;
    on(event: string, listener: Function): this;
  }

  interface FsTempApi {
    open(flags: 'w' | 'w+', cb: Callback<FsTemFd>): void;
    open(flags: 'w' | 'w+', mode: string | number, cb: Callback<FsTemFd>): void;

    openSync(flags: 'w' | 'w+', mode?: string | number): FsTemFd;

    mkdir(mode: string | number, cb: Callback<string>): void;
    mkdir(cb: Callback<string>): void;

    mkdirSync(mode?: string | number): string;

    writeFile(data: Buffer | string, encoding: string, cb: Callback<string>): void;
    writeFile(data: Buffer | string, cb: Callback<string>): void;

    writeFileSync(data: Buffer | string, encoding?: string): string;

    createWriteStream(options?: string | {
      flags?: string;
      encoding?: string;
      fd?: number;
      mode?: number;
      autoClose?: boolean;
      start?: number;
    }): TempWriteStream;
  }

  function open(flags: 'w' | 'w+', cb: Callback<FsTemFd>): void;
  function open(flags: 'w' | 'w+', mode: string | number, cb: Callback<FsTemFd>): void;

  function openSync(flags: 'w' | 'w+', mode?: string | number): FsTemFd;

  function mkdir(mode: string | number, cb: Callback<string>): void;
  function mkdir(cb: Callback<string>): void;

  function mkdirSync(mode?: string | number): string;

  function writeFile(data: Buffer | string, encoding: string, cb: Callback<string>): void;
  function writeFile(data: Buffer | string, cb: Callback<string>): void;

  function writeFileSync(data: Buffer | string, encoding?: string): string;

  function createWriteStream(options?: string | {
    flags?: string;
    encoding?: string;
    fd?: number;
    mode?: number;
    autoClose?: boolean;
    start?: number;
  }): TempWriteStream;

  function template(tmp: string): FsTempApi;
}
