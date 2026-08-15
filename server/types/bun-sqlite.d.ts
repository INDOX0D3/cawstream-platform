/**
 * Minimal type declarations for the subset of bun:sqlite used by this server.
 * (The full types ship with @types/bun; this keeps the server dependency-free
 * while still typechecked by tsc.)
 */

declare module "bun:sqlite" {
  export class Statement {
    all(...params: Array<string | number | bigint | null | Uint8Array>): unknown[];
    get(...params: Array<string | number | bigint | null | Uint8Array>): unknown;
    run(...params: Array<string | number | bigint | null | Uint8Array>): {
      changes: number;
      lastInsertRowid: number | bigint;
    };
  }

  export interface DatabaseOptions {
    create?: boolean;
    readwrite?: boolean;
    readonly?: boolean;
  }

  export class Database {
    constructor(path: string, options?: DatabaseOptions);
    exec(sql: string): void;
    run(sql: string, ...params: Array<string | number | bigint | null | Uint8Array>): {
      changes: number;
      lastInsertRowid: number | bigint;
    };
    query(sql: string): Statement;
    close(): void;
  }
}
