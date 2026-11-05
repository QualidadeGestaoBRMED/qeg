import { describe, expect, it } from "vitest";
import pg from "pg";
import { dbConnectionOptions } from "../../api/_lib/db-connection.mjs";

describe("dbConnectionOptions", () => {
  it("desativa SSL para Postgres local", () => {
    expect(dbConnectionOptions("postgresql://user:pass@localhost:5432/rito")).toEqual({ ssl: false });
  });

  it("desativa SSL para Postgres local em IPv6", () => {
    expect(dbConnectionOptions("postgresql://user:pass@[::1]:5432/rito")).toEqual({ ssl: false });
  });

  it("exige verify-full em conexões remotas", () => {
    expect(dbConnectionOptions("postgresql://user:pass@ep-example-pooler.neon.tech/rito?sslmode=verify-full")).toEqual({});
    expect(() => dbConnectionOptions("postgresql://user:pass@ep-example-pooler.neon.tech/rito?sslmode=require"))
      .toThrow("DATABASE_URL remoto precisa incluir sslmode=verify-full.");
  });

  it("cria cliente pg com TLS para URL remota verify-full", () => {
    const connectionString = "postgresql://user:pass@ep-example-pooler.neon.tech/rito?sslmode=verify-full";
    const client = new pg.Client({ connectionString, ...dbConnectionOptions(connectionString) });
    const ssl = (client as unknown as { connectionParameters: { ssl: unknown } }).connectionParameters.ssl;

    expect(ssl).toEqual({});
    expect(ssl).not.toBe(false);
  });
});
