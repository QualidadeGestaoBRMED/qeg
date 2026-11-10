import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const ler = (arquivo: string) => readFileSync(new URL(`../../db/${arquivo}`, import.meta.url), "utf8");

const sql = (texto: string) =>
  texto
    .split("\n")
    .map((linha) => linha.trim())
    .filter((linha) => linha && !linha.startsWith("--"))
    .join("\n");

describe("migration 0001", () => {
  it("é igual a schema.sql + seed.sql", () => {
    expect(sql(ler("migrations/0001_rito_schema.sql"))).toBe(sql(ler("schema.sql")) + "\n" + sql(ler("seed.sql")));
  });
});
