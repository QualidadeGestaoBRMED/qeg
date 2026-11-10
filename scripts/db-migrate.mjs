import { readdirSync, readFileSync } from "node:fs";
import pg from "pg";

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("Defina DATABASE_URL (use uma URL direta para migrations no Neon).");
  process.exit(1);
}

const directory = process.env.RITO_MIGRATIONS_DIR ? new URL(`file://${process.env.RITO_MIGRATIONS_DIR.replace(/\\/g, "/")}/`) : new URL("../db/migrations/", import.meta.url);
const migrations = readdirSync(directory).filter((name) => /^\d+_[\w-]+\.sql$/.test(name)).sort();
const versions = migrations.map((name) => name.match(/^(\d+)_/)[1]);
if (new Set(versions).size !== versions.length) {
  throw new Error("Versões de migration duplicadas.");
}
const parsedUrl = new URL(url);
const isLocal = ["localhost", "127.0.0.1", "::1"].includes(parsedUrl.hostname);
if (!isLocal && parsedUrl.searchParams.get("sslmode") !== "verify-full") {
  throw new Error("Conexões remotas de migration exigem sslmode=verify-full e conexão direta.");
}
const client = new pg.Client({ connectionString: url, ssl: isLocal ? false : { rejectUnauthorized: true } });
await client.connect();
try {
  await client.query("create table if not exists schema_migrations (version text primary key, applied_at timestamptz not null default now())");
  for (const name of migrations) {
    await client.query("begin");
    try {
      const { rowCount } = await client.query("select 1 from schema_migrations where version = $1", [name]);
      if (!rowCount) {
        await client.query(readFileSync(new URL(name, directory), "utf8"));
        await client.query("insert into schema_migrations (version) values ($1)", [name]);
        console.log(`Aplicada: ${name}`);
      }
      await client.query("commit");
    } catch (error) {
      await client.query("rollback");
      throw error;
    }
  }
} finally {
  await client.end();
}
