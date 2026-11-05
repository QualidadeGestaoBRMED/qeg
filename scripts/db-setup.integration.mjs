import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import pg from "pg";

const root = fileURLToPath(new URL("..", import.meta.url));
const container = `qeg-db-setup-test-${process.pid}-${randomUUID().slice(0, 8)}`;
const password = randomUUID();
let client;

function docker(args, options = {}) {
  return execFileSync("docker", args, { encoding: "utf8", stdio: "pipe", ...options }).trim();
}

function runSetup(databaseUrl, branch = "dev", examples = false, vercelEnv = "test") {
  const args = ["scripts/db-setup.mjs"];
  if (examples) args.push("--exemplos");
  return spawnSync(process.execPath, args, {
    cwd: root,
    encoding: "utf8",
    env: { PATH: process.env.PATH ?? "", DATABASE_URL: databaseUrl, RITO_DB_BRANCH: branch, VERCEL_ENV: vercelEnv },
  });
}

async function aguardarPostgres(databaseUrl) {
  for (let tentativa = 0; tentativa < 40; tentativa += 1) {
    const conexao = new pg.Client({ connectionString: databaseUrl, ssl: false, connectionTimeoutMillis: 500 });
    try {
      await conexao.connect();
      await conexao.end();
      return;
    } catch {
      await conexao.end().catch(() => {});
      await new Promise((resolve) => setTimeout(resolve, 250));
    }
  }
  throw new Error("Postgres local não ficou pronto no prazo.");
}

try {
  for (const arquivo of ["schema.sql", "seed.sql", "exemplos.sql"]) {
    const sql = readFileSync(new URL(`../db/${arquivo}`, import.meta.url), "utf8");
    assert.doesNotMatch(sql, /\bdrop\s+(?:schema|table)\b/i, `${arquivo} não pode remover tabelas ou schemas`);
  }

  docker([
    "run", "--detach", "--rm", "--name", container,
    "--env", `POSTGRES_PASSWORD=${password}`,
    "--env", "POSTGRES_DB=rito_test",
    "--publish", "127.0.0.1::5432",
    "postgres:16-alpine",
  ]);
  const mappedPort = Number(docker(["port", container, "5432/tcp"]).split(":").at(-1));
  const databaseUrl = `postgresql://postgres:${password}@127.0.0.1:${mappedPort}/rito_test`;
  await aguardarPostgres(databaseUrl);

  client = new pg.Client({ connectionString: databaseUrl, ssl: false });
  await client.connect();

  const primeiraExecucao = runSetup(databaseUrl, "dev", true);
  assert.equal(primeiraExecucao.status, 0, primeiraExecucao.stderr);
  assert.match(primeiraExecucao.stdout, /Itens de exemplo do Suporte criados/);
  const contagemSeedInicial = await client.query(`
    select (select count(*)::int from areas) as areas,
      (select count(*)::int from produtos) as produtos,
      (select count(*)::int from produto_areas) as produto_areas
  `);
  const exemplosIniciais = await client.query("select count(*)::int as total from itens");
  assert.ok(exemplosIniciais.rows[0].total > 0);

  await client.query(`
    insert into itens (area_id, produto_id, titulo)
    values ((select id from areas where nome = 'Suporte'),
      (select id from produtos where nome = 'Multissistemas'), 'registro criado entre setups')
  `);

  const segundaExecucao = runSetup(databaseUrl, "dev", true);
  assert.equal(segundaExecucao.status, 0, segundaExecucao.stderr);
  assert.match(segundaExecucao.stdout, /Já existem/);
  const contagemSeedFinal = await client.query(`
    select (select count(*)::int from areas) as areas,
      (select count(*)::int from produtos) as produtos,
      (select count(*)::int from produto_areas) as produto_areas
  `);
  assert.deepEqual(contagemSeedFinal.rows[0], contagemSeedInicial.rows[0]);
  const exemplosFinais = await client.query("select count(*)::int as total from itens where titulo <> $1", ["registro criado entre setups"]);
  assert.equal(exemplosFinais.rows[0].total, exemplosIniciais.rows[0].total);

  const preservados = await client.query("select count(*)::int as total from itens where titulo = $1", ["registro criado entre setups"]);
  assert.equal(preservados.rows[0].total, 1);

  const exemplosForaDaDev = runSetup(databaseUrl, "main", true);
  assert.notEqual(exemplosForaDaDev.status, 0);
  assert.match(exemplosForaDaDev.stderr, /RITO_DB_BRANCH=dev/);
  const exemplosEmProduction = runSetup(databaseUrl, "dev", true, "production");
  assert.notEqual(exemplosEmProduction.status, 0);
  assert.match(exemplosEmProduction.stderr, /fora de Production/);
  const itensAposBloqueio = await client.query("select count(*)::int as total from itens");
  assert.equal(itensAposBloqueio.rows[0].total, exemplosIniciais.rows[0].total + 1);

  console.log("db:setup local: exemplos foram criados na dev vazia, uma segunda execução não duplicou seeds e preservou dados; --exemplos foi bloqueado fora de dev.");
} finally {
  if (client) await client.end().catch(() => {});
  spawnSync("docker", ["rm", "--force", container], { stdio: "ignore" });
}
