// Cria as tabelas e a carga inicial do rito no banco de DATABASE_URL (Neon ou Postgres local).
//   npm run db:setup              -> tabelas + áreas + produtos do Suporte
//   npm run db:setup -- --exemplos -> idem + itens de exemplo do Suporte (só se não houver itens)
import { readFileSync } from "node:fs";
import pg from "pg";

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("Defina DATABASE_URL (veja .env.example).");
  process.exit(1);
}

const ler = (nome) => readFileSync(new URL(`../db/${nome}`, import.meta.url), "utf8");
const client = new pg.Client({
  connectionString: url,
  ssl: /localhost|127\.0\.0\.1/.test(url) ? false : { rejectUnauthorized: false },
});

await client.connect();
try {
  await client.query(ler("schema.sql"));
  await client.query(ler("seed.sql"));
  console.log("Tabelas e carga inicial ok.");
  if (process.argv.includes("--exemplos")) {
    const { rows } = await client.query("select count(*)::int as n from itens");
    if (rows[0].n === 0) {
      await client.query(ler("exemplos.sql"));
      console.log("Itens de exemplo do Suporte criados.");
    } else {
      console.log(`Já existem ${rows[0].n} itens; exemplos não foram criados.`);
    }
  }
} finally {
  await client.end();
}
