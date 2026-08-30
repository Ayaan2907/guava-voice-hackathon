import { readFileSync } from "fs";
import path from "path";
import { Pool } from "pg";

const g = globalThis as unknown as { __pactPool?: Pool };

export function databaseUrl() {
  return process.env.DATABASE_URL ?? "postgres://pact:pact@127.0.0.1:5433/pact";
}

export function getPool() {
  if (!g.__pactPool) {
    g.__pactPool = new Pool({ connectionString: databaseUrl() });
  }
  return g.__pactPool;
}

export async function ensureSchema() {
  const sql = readFileSync(path.join(process.cwd(), "src/lib/schema.sql"), "utf8");
  await getPool().query(sql);
}
