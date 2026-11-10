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
  const setup = spawnSync(process.execPath, ["scripts/db-setup.mjs"], { cwd: root, encoding: "utf8", env: { ...process.env, DATABASE_URL: url } });
  assert.equal(setup.status, 0, setup.stderr);
  await client.query("insert into areas (nome) values ('preserved by migration')");
  const ok = run(url);
  assert.equal(ok.status, 0, ok.stderr);
  const again = run(url);
  assert.equal(again.status, 0, again.stderr);
  assert.doesNotMatch(again.stdout, /Aplicada:/);
  const applied = await client.query("select version from schema_migrations order by version");
  assert.deepEqual(applied.rows.map((r) => r.version), ["1"]);
  const preserved = await client.query("select count(*)::int as n from areas where nome = 'preserved by migration'");
  assert.equal(preserved.rows[0].n, 1);

  const badDir = join(tmp, "db", "migrations");
  mkdirSync(badDir, { recursive: true });
  writeFileSync(join(badDir, "0002_rollback.sql"), "create table rollback_probe (id integer); select 1 / 0;");
  const failing = spawnSync(process.execPath, ["scripts/db-migrate.mjs"], { cwd: root, encoding: "utf8", env: { ...process.env, DATABASE_URL: url, RITO_MIGRATIONS_DIR: badDir } });
  assert.notEqual(failing.status, 0);
  const probe = await client.query("select to_regclass('public.rollback_probe') as table_name");
  assert.equal(probe.rows[0].table_name, null);
  const history = await client.query("select version from schema_migrations order by version");
  assert.deepEqual(history.rows.map((r) => r.version), ["1"]);

  const tls = spawnSync(process.execPath, ["scripts/db-migrate.mjs"], { cwd: root, encoding: "utf8", env: { ...process.env, DATABASE_URL: "postgresql://example.invalid/db" } });
  assert.match(tls.stderr, /sslmode=verify-full/);
  const ipv6 = spawnSync(process.execPath, ["scripts/db-migrate.mjs"], { cwd: root, encoding: "utf8", env: { ...process.env, DATABASE_URL: "postgresql://user:pass@[::1]:1/db" } });
  assert.doesNotMatch(ipv6.stderr, /sslmode=verify-full/);

  const orderedDir = join(tmp, "ordered");
  mkdirSync(orderedDir);
  writeFileSync(join(orderedDir, "10_second.sql"), "insert into order_probe values ('10');");
  writeFileSync(join(orderedDir, "2_first.sql"), "create table order_probe (value text);");
  const ordered = spawnSync(process.execPath, ["scripts/db-migrate.mjs"], { cwd: root, encoding: "utf8", env: { ...process.env, DATABASE_URL: url, RITO_MIGRATIONS_DIR: orderedDir } });
  assert.equal(ordered.status, 0, ordered.stderr);
  assert.deepEqual((await client.query("select version from schema_migrations where version in ('2','10') order by version::bigint")).rows.map((r) => r.version), ["2", "10"]);
  writeFileSync(join(orderedDir, "2_renamed.sql"), "create table should_not_reapply (id integer);");
  const renamed = spawnSync(process.execPath, ["scripts/db-migrate.mjs"], { cwd: root, encoding: "utf8", env: { ...process.env, DATABASE_URL: url, RITO_MIGRATIONS_DIR: orderedDir } });
  assert.equal(renamed.status, 0, renamed.stderr);
  assert.equal((await client.query("select to_regclass('public.should_not_reapply') as table_name")).rows[0].table_name, null);
  const dupDir = join(tmp, "duplicates");
  mkdirSync(dupDir);
  writeFileSync(join(dupDir, "2_first.sql"), "select 1;");
  writeFileSync(join(dupDir, "02_second.sql"), "select 2;");
  const duplicate = spawnSync(process.execPath, ["scripts/db-migrate.mjs"], { cwd: root, encoding: "utf8", env: { ...process.env, DATABASE_URL: "postgresql://example.invalid/db?sslmode=verify-full", RITO_MIGRATIONS_DIR: dupDir } });
  assert.match(duplicate.stderr, /duplicadas/);
  console.log("db:migrate local: db:setup compatível; repetição/renomeação não reaplicam; rollback, ordenação 2/10, loopback IPv6, TLS remoto e duplicatas validados.");
} finally {
  if (client) await client.end().catch(() => {});
  spawnSync("docker", ["rm", "--force", container], { stdio: "ignore" });
  rmSync(tmp, { recursive: true, force: true });
}
