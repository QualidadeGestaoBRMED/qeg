import { readdirSync, readFileSync } from "node:fs";
import pg from "pg";

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("Defina DATABASE_URL (use uma URL direta para migrations no Neon).");
  process.exit(1);
}

const directory = process.env.RITO_MIGRATIONS_DIR ? new URL(`file://${process.env.RITO_MIGRATIONS_DIR.replace(/\\/g, "/")}/`) : new URL("../db/migrations/", import.meta.url);
const migrations = readdirSync(directory).filter((name) => /^\d+_[\w-]+\.sql$/.test(name)).sort();
if (migrations.some((name, index) => index > 0 && name.slice(0, 4) === migrations[index - 1].slice(0, 4))) {
  throw new Error("Versões de migration duplicadas.");
}
const client = new pg.Client({ connectionString: url, ssl: /localhost|127\.0\.0\.1/.test(url) ? false : { rejectUnauthorized: false } });
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
