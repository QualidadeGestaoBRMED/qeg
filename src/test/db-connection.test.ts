import { describe, expect, it } from "vitest";
import pg from "pg";
import { dbConnectionOptions } from "../../api/_lib/db-connection.mjs";

describe("dbConnectionOptions", () => {
  it("desativa SSL para Postgres local", () => {
    expect(dbConnectionOptions("postgresql://user:pass@localhost:5432/rito")).toEqual({ ssl: false });
  });

  it("desativa SSL para loopback IPv4", () => {
    expect(dbConnectionOptions("postgresql://user:pass@127.0.0.1:5432/rito")).toEqual({ ssl: false });
  });

  it("desativa SSL para Postgres local em IPv6", () => {
    expect(dbConnectionOptions("postgresql://user:pass@[::1]:5432/rito")).toEqual({ ssl: false });
  });

  it("rejeita URLs malformadas", () => {
    expect(() => dbConnectionOptions("not a database URL")).toThrow(TypeError);
  });

  it("exige verify-full em conexões remotas", () => {
    expect(dbConnectionOptions("postgresql://user:pass@ep-example-pooler.neon.tech/rito?sslmode=verify-full")).toEqual({});
    expect(() => dbConnectionOptions("postgresql://user:pass@ep-example-pooler.neon.tech/rito"))
      .toThrow("DATABASE_URL remoto precisa incluir sslmode=verify-full.");
    expect(() => dbConnectionOptions("postgresql://user:pass@ep-example-pooler.neon.tech/rito?sslmode=require"))
      .toThrow("DATABASE_URL remoto precisa incluir sslmode=verify-full.");
  });

  it("configura TLS no cliente criado com as opções do pool remoto verify-full", async () => {
    const connectionString = "postgresql://user:pass@ep-example-pooler.neon.tech/rito?sslmode=verify-full";
    const pool = new pg.Pool({ connectionString, ...dbConnectionOptions(connectionString) });
    const client = new pg.Client(pool.options);
    const ssl = (client as unknown as { connectionParameters: { ssl: unknown } }).connectionParameters.ssl;

    expect(pool.options.connectionString).toBe(connectionString);
    expect(ssl).toEqual({});
    expect(ssl).not.toBe(false);
    await pool.end();
  });
});
