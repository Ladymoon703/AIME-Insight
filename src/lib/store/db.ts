/**
 * SQLite 持久化层（Node 内置 node:sqlite，无额外依赖）。
 * 仅服务端调用；全部使用参数化查询，杜绝 SQL 注入。
 * 为便于单元测试，不依赖 @/ 别名（路径由 process.env 计算），并提供测试用临时库切换。
 */
import { DatabaseSync } from "node:sqlite";
import { mkdirSync } from "node:fs";
import { dirname } from "node:path";

function defaultDbPath(): string {
  return (process.env.AIME_DB_PATH || process.cwd() + "/data/aime.db").trim();
}

let db: DatabaseSync | null = null;
let dbPath = defaultDbPath();

export function getDb(): DatabaseSync {
  if (db) return db;
  mkdirSync(dirname(dbPath), { recursive: true });
  db = new DatabaseSync(dbPath);
  db.exec(`
    PRAGMA journal_mode = WAL;

    CREATE TABLE IF NOT EXISTS researches (
      id TEXT PRIMARY KEY,
      thscode TEXT NOT NULL,
      company_name TEXT NOT NULL,
      ticker TEXT NOT NULL,
      research_goal TEXT,
      time_window TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS research_versions (
      id TEXT PRIMARY KEY,
      research_id TEXT NOT NULL,
      version INTEGER NOT NULL,
      snapshot TEXT NOT NULL,
      created_at TEXT NOT NULL,
      UNIQUE(research_id, version)
    );

    CREATE TABLE IF NOT EXISTS observations (
      id TEXT PRIMARY KEY,
      research_id TEXT NOT NULL,
      thscode TEXT NOT NULL,
      company_name TEXT NOT NULL,
      title TEXT NOT NULL,
      description TEXT,
      dimensions TEXT NOT NULL DEFAULT '[]',
      metrics TEXT NOT NULL DEFAULT '[]',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      last_checked_at TEXT,
      last_result TEXT
    );
  `);
  return db;
}

/** 仅测试用：切换到内存/临时数据库 */
export function __setDbForTesting(path: string): void {
  if (db) {
    db.close();
    db = null;
  }
  dbPath = path;
}

export function newId(): string {
  return crypto.randomUUID();
}

export function now(): string {
  return new Date().toISOString();
}
