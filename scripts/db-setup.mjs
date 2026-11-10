// Cria as tabelas e a carga inicial do rito no banco de DATABASE_URL (Neon ou Postgres local).
//   npm run db:setup              -> tabelas + áreas + produtos do Suporte
//   RITO_DB_BRANCH=dev npm run db:setup -- --exemplos -> idem + exemplos, só na dev e se não houver itens
import { readFileSync } from "node:fs";
import pg from "pg";
import { dbConnectionOptions } from "../api/_lib/db-connection.mjs";

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("Defina DATABASE_URL (veja .env.example).");
  process.exit(1);
}

const incluirExemplos = process.argv.includes("--exemplos");
if (incluirExemplos && (process.env.RITO_DB_BRANCH !== "dev" || process.env.VERCEL_ENV === "production")) {
  console.error("A carga de exemplos só pode rodar na branch dev, fora de Production, com RITO_DB_BRANCH=dev.");
  process.exit(1);
}

const ler = (nome) => readFileSync(new URL(`../db/${nome}`, import.meta.url), "utf8");
const client = new pg.Client({
  connectionString: url,
  ...dbConnectionOptions(url),
});

await client.connect();
let transacaoAberta = false;
try {
  await client.query("begin");
  transacaoAberta = true;
  await client.query(ler("schema.sql"));
  await client.query(ler("seed.sql"));
  if (incluirExemplos) {
    const { rows } = await client.query("select count(*)::int as n from itens");
    if (rows[0].n === 0) {
      await client.query(ler("exemplos.sql"));
      console.log("Itens de exemplo do Suporte criados.");
    } else {
      console.log(`Já existem ${rows[0].n} itens; exemplos não foram criados.`);
    }
  }
  await client.query("commit");
  transacaoAberta = false;
  console.log("Tabelas e carga inicial ok.");
} catch (error) {
  if (transacaoAberta) await client.query("rollback").catch(() => {});
  throw error;
} finally {
  await client.end();
}
