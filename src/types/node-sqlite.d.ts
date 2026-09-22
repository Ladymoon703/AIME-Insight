/**
 * node:sqlite 最小类型声明（Node 22+ 内置，@types/node@20 尚未包含）。
 * 覆盖本项目用到的 DatabaseSync / StatementSync API。
 */
declare module "node:sqlite" {
  interface StatementSync {
    run(...params: unknown[]): unknown;
    get(...params: unknown[]): unknown;
    all(...params: unknown[]): unknown[];
  }

  class DatabaseSync {
    constructor(path: string, options?: unknown);
    exec(sql: string): void;
    prepare(sql: string): StatementSync;
    close(): void;
  }

  export { DatabaseSync };
}
