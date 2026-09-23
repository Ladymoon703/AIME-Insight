/**
 * 持久化层（@libsql/client，兼容 Turso 远程 / 本地 file: / 内存）。
 * 仅服务端调用；全部使用参数化查询，杜绝 SQL 注入。
 * 配置 TURSO_DATABASE_URL 时走 Turso（Vercel 上持久化）；否则回退本地 file:（开发/测试）。
 * 为便于单元测试，不依赖 @/ 别名，并提供测试用临时库切换。
 */
import { createClient, type Client } from "@libsql/client";
import { mkdirSync } from "node:fs";
import { dirname } from "node:path";

let testUrl: string | null = null;

function resolveUrl(): string {
  if (testUrl) return testUrl;
  const turso = (process.env.TURSO_DATABASE_URL ?? "").trim();
  if (turso) return turso;
  const localPath =
    (process.env.AIME_DB_PATH ?? "").trim() || process.cwd() + "/data/aime.db";
  return "file:" + localPath;
}

let client: Client | null = null;
let currentUrl = "";
let initPromise: Promise<void> | null = null;

const SCHEMA = [
  `CREATE TABLE IF NOT EXISTS researches (
    id TEXT PRIMARY KEY,
    thscode TEXT NOT NULL,
    company_name TEXT NOT NULL,
    ticker TEXT NOT NULL,
    research_goal TEXT,
    time_window TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS research_versions (
    id TEXT PRIMARY KEY,
    research_id TEXT NOT NULL,
    version INTEGER NOT NULL,
    snapshot TEXT NOT NULL,
    created_at TEXT NOT NULL,
    UNIQUE(research_id, version)
  )`,
  `CREATE TABLE IF NOT EXISTS observations (
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
  )`,
];

/** 获取（并初始化）数据库客户端；首次调用时建表。 */
export async function getDb(): Promise<Client> {
  const url = resolveUrl();
  if (!client || currentUrl !== url) {
    if (url.startsWith("file:") && !url.includes(":memory:")) {
      mkdirSync(dirname(url.slice("file:".length)), { recursive: true });
    }
    client = createClient({
      url,
      authToken: (process.env.TURSO_AUTH_TOKEN ?? "").trim() || undefined,
    });
    currentUrl = url;
    initPromise = null;
  }
  if (!initPromise) {
    initPromise = (async () => {
      for (const sql of SCHEMA) await client!.execute(sql);
    })();
  }
  await initPromise;
  return client;
}

/** 仅测试用：切换到内存/临时数据库 */
export function __setDbForTesting(url: string): void {
  testUrl = url;
  client = null;
  currentUrl = "";
  initPromise = null;
}

export function newId(): string {
  return crypto.randomUUID();
}

export function now(): string {
  return new Date().toISOString();
}
