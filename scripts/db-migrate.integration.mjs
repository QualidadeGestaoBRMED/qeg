import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import { randomUUID } from "node:crypto";
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import pg from "pg";

const container = `qeg-migrate-${process.pid}-${randomUUID().slice(0, 8)}`;
const pass = randomUUID();
const tmp = mkdtempSync(join(tmpdir(), "qeg-migrate-"));
const root = new URL("..", import.meta.url);
const migrationDir = new URL("../db/migrations/", import.meta.url);
const run = (url) => spawnSync(process.execPath, ["scripts/db-migrate.mjs"], { cwd: root, encoding: "utf8", env: { ...process.env, DATABASE_URL: url } });
const docker = (args) => execFileSync("docker", args, { encoding: "utf8", stdio: "pipe" }).trim();
let client;
try {
  docker(["run", "--detach", "--rm", "--name", container, "--env", `POSTGRES_PASSWORD=${pass}`, "--env", "POSTGRES_DB=rito_test", "--publish", "127.0.0.1::5432", "postgres:16-alpine"]);
  const port = docker(["port", container, "5432/tcp"]).split(":").at(-1);
  const url = `postgresql://postgres:${pass}@127.0.0.1:${port}/rito_test`;
  for (let n = 0; n < 50; n++) {
    try { client = new pg.Client({ connectionString: url }); await client.connect(); break; }
    catch { await new Promise((resolve) => setTimeout(resolve, 200)); }
  }
  assert.ok(client, "Postgres efêmero iniciou");
  const ok = run(url);
  assert.equal(ok.status, 0, ok.stderr);
  const again = run(url);
  assert.equal(again.status, 0, again.stderr);
  assert.doesNotMatch(again.stdout, /Aplicada:/);
  const applied = await client.query("select version from schema_migrations order by version");
  assert.deepEqual(applied.rows.map((r) => r.version), ["0001_initial.sql"]);

  const badDir = join(tmp, "db", "migrations");
  mkdirSync(badDir, { recursive: true });
  writeFileSync(join(badDir, "0002_rollback.sql"), "create table rollback_probe (id integer); select 1 / 0;");
  const failing = spawnSync(process.execPath, ["scripts/db-migrate.mjs"], { cwd: root, encoding: "utf8", env: { ...process.env, DATABASE_URL: url, RITO_MIGRATIONS_DIR: badDir } });
  assert.notEqual(failing.status, 0);
  const probe = await client.query("select to_regclass('public.rollback_probe') as table_name");
  assert.equal(probe.rows[0].table_name, null);
  const history = await client.query("select version from schema_migrations order by version");
  assert.deepEqual(history.rows.map((r) => r.version), ["0001_initial.sql"]);
  console.log("db:migrate local: segunda execução não reaplicou; migration com erro não deixou tabela nem registro.");
} finally {
  if (client) await client.end().catch(() => {});
  spawnSync("docker", ["rm", "--force", container], { stdio: "ignore" });
  rmSync(tmp, { recursive: true, force: true });
}
