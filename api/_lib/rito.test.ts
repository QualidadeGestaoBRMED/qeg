import { createHmac } from "node:crypto";
import { EventEmitter } from "node:events";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  query: vi.fn(),
  connect: vi.fn(),
  release: vi.fn(),
  pools: [] as EventEmitter[],
  poolOptions: undefined as Record<string, unknown> | undefined,
}));
vi.mock("pg", () => ({
  default: {
    Pool: vi.fn((options: Record<string, unknown>) => {
      const pool = Object.assign(new EventEmitter(), { query: mocks.query, connect: mocks.connect });
      mocks.poolOptions = options;
      mocks.pools.push(pool);
      return pool;
    }),
  },
}));

import { ritoHandler } from "./rito.js";

const secret = "test-session-secret";
function request(body: unknown, authenticated = true) {
  const req = new EventEmitter() as EventEmitter & { method: string; headers: Record<string, string>; body: unknown };
  req.method = "POST";
  req.headers = {};
  req.body = body;
  if (authenticated) {
    const exp = String(Math.floor(Date.now() / 1000) + 3600);
    const sig = createHmac("sha256", secret).update(exp).digest("hex");
    req.headers.cookie = `qeg_session=${exp}.${sig}`;
  }
  return req;
}
function response() {
  return { statusCode: 0, headers: {} as Record<string, string>, body: "", setHeader(k: string, v: string) { this.headers[k] = v; }, end(v: string) { this.body = v; } };
}
const item = { id: 9, areaId: 1, produtoId: 2, titulo: "Feature", problema: "", solicitante: "", pilar: null, etapa: "discovery", reach: 2, impact: 1, confidence: 0.8, effort: 3, solucao: "", riscos: "", motivo: "", pipefyUrl: null, criadoEm: "", atualizadoEm: "" };

describe("API do Rito: segurança", () => {
  beforeEach(() => {
    process.env.SESSION_SECRET = secret;
    process.env.DATABASE_URL = "postgres://localhost/test";
    mocks.query.mockReset();
    mocks.connect.mockReset();
    mocks.release.mockReset();
    mocks.connect.mockResolvedValue({ query: mocks.query, release: mocks.release });
    mocks.query.mockImplementation((sql: string) => {
      if (/^select/i.test(sql.trim())) return Promise.resolve({ rows: [item] });
      if (/^update|^insert/i.test(sql.trim())) return Promise.resolve({ rowCount: 1 });
      return Promise.resolve({});
    });
  });
  afterEach(() => vi.clearAllMocks());

  it("responde 401 sem sessão antes de consultar o banco", async () => {
    const res = response();
    await ritoHandler(request({ acao: "areas" }, false) as never, res as never);
    expect(res.statusCode).toBe(401);
    expect(mocks.query).not.toHaveBeenCalled();
  });

  const urlBanco = "postgresql://rito_user:supersecret@db.example/rito";
  const mensagemDriver = `connection failed for ${urlBanco} user=rito_user password=supersecret token=abc123`;

  function expectaSemSegredos(...saidas: unknown[]) {
    const serializado = JSON.stringify(saidas);
    for (const segredo of [urlBanco, "rito_user", "supersecret", "abc123", "db.example", "connection failed"]) {
      expect(serializado).not.toContain(segredo);
    }
  }

  it.each(["ECONNREFUSED", "ETIMEDOUT", "ENOTFOUND", "ECONNRESET", "57P01", "57P03", "08006", "08001"])(
    "responde 503 e loga só name, code e mensagem fixa quando o banco está indisponível (%s)",
    async (code) => {
      const logSeguro = vi.spyOn(console, "error").mockImplementation(() => {});
      mocks.query.mockRejectedValueOnce(Object.assign(new Error(mensagemDriver), { code }));
      const res = response();

      await ritoHandler(request({ acao: "areas" }) as never, res as never);

      expect(res.statusCode).toBe(503);
      expect(JSON.parse(res.body)).toEqual({ error: "Banco do Rito temporariamente indisponível. Tente novamente em instantes." });
      expect(logSeguro).toHaveBeenCalledWith("rito: falha ao processar a ação", {
        name: "Error",
        code,
        message: "Falha ao processar a ação no banco do Rito.",
        stack: expect.any(Array),
      });
      expectaSemSegredos(res.body, logSeguro.mock.calls);
      logSeguro.mockRestore();
    },
  );

  it.each([
    ["erro SQL (violação de unicidade)", Object.assign(new Error(mensagemDriver), { code: "23505" })],
    ["erro sem código", new TypeError(mensagemDriver)],
    ["valor que não é Error", mensagemDriver],
  ])("responde 500 genérico e sem detalhes para %s", async (_nome, erro) => {
    const logSeguro = vi.spyOn(console, "error").mockImplementation(() => {});
    mocks.query.mockRejectedValueOnce(erro);
    const res = response();

    await ritoHandler(request({ acao: "areas" }) as never, res as never);

    expect(res.statusCode).toBe(500);
    expect(JSON.parse(res.body)).toEqual({ error: "Erro interno no Rito" });
    expect(logSeguro).toHaveBeenCalledTimes(1);
    expect(logSeguro.mock.calls[0][1]).toMatchObject({ message: "Falha ao processar a ação no banco do Rito." });
    expectaSemSegredos(res.body, logSeguro.mock.calls);
    logSeguro.mockRestore();
  });

  it("timeout de conexão do pg (sem code) conta como indisponibilidade e responde 503", async () => {
    const logSeguro = vi.spyOn(console, "error").mockImplementation(() => {});
    mocks.query.mockRejectedValueOnce(new Error("timeout exceeded when trying to connect"));
    const res = response();

    await ritoHandler(request({ acao: "areas" }) as never, res as never);

    expect(res.statusCode).toBe(503);
    expect(JSON.parse(res.body)).toEqual({ error: "Banco do Rito temporariamente indisponível. Tente novamente em instantes." });
    logSeguro.mockRestore();
  });

  it("cria o pool com timeout de conexão de 5s", async () => {
    await ritoHandler(request({ acao: "areas" }) as never, response() as never);
    expect(mocks.poolOptions).toMatchObject({ connectionTimeoutMillis: 5000 });
  });

  it("loga name, code, campos estruturais e stack sem a mensagem em erro 23503, sem segredos", async () => {
    const logSeguro = vi.spyOn(console, "error").mockImplementation(() => {});
    const erro = Object.assign(new Error(`${mensagemDriver}\n    at vazamento (${urlBanco})`), {
      code: "23503",
      severity: "ERROR",
      routine: "ri_ReportViolation",
      constraint: "itens_produto_id_fkey",
      table: "itens",
      column: "produto_id",
      schema: "public",
      detail: "Key (produto_id)=(supersecret) is not present in table produtos.",
    });
    mocks.query.mockRejectedValueOnce(erro);
    const res = response();

    await ritoHandler(request({ acao: "areas" }) as never, res as never);

    expect(res.statusCode).toBe(500);
    expect(logSeguro).toHaveBeenCalledTimes(1);
    const diagnostico = logSeguro.mock.calls[0][1] as { stack: string[] } & Record<string, unknown>;
    expect(diagnostico).toMatchObject({
      name: "Error",
      code: "23503",
      severity: "ERROR",
      routine: "ri_ReportViolation",
      constraint: "itens_produto_id_fkey",
      table: "itens",
      column: "produto_id",
      schema: "public",
      message: "Falha ao processar a ação no banco do Rito.",
    });
    expect(diagnostico).not.toHaveProperty("detail");
    expect(diagnostico.stack.length).toBeGreaterThan(0);
    expect(diagnostico.stack.every((linha) => linha.startsWith("at "))).toBe(true);
    expect(diagnostico.stack.join("\n")).toContain("rito.test.ts");
    expectaSemSegredos(res.body, logSeguro.mock.calls, "vazamento");
    logSeguro.mockRestore();
  });

  it("registra erro do pool com o mesmo log seguro e não derruba o processo", async () => {
    await ritoHandler(request({ acao: "areas" }) as never, response() as never);
    const logSeguro = vi.spyOn(console, "error").mockImplementation(() => {});
    const erroPool = Object.assign(new Error(mensagemDriver), { code: "ECONNRESET" });

    expect(() => mocks.pools[0].emit("error", erroPool)).not.toThrow();

    expect(logSeguro).toHaveBeenCalledWith("rito: erro no pool do banco", expect.objectContaining({
      name: "Error",
      code: "ECONNRESET",
      message: "Falha ao processar a ação no banco do Rito.",
    }));
    expectaSemSegredos(logSeguro.mock.calls);
    logSeguro.mockRestore();
  });

  it("usa parâmetros para valores e rejeita coluna fora de EDITAVEIS sem UPDATE", async () => {
    const res = response();
    await ritoHandler(request({ acao: "atualizarItem", id: 9, campos: { titulo: "x'); DROP TABLE itens;--" } }) as never, res as never);
    const updateCall = mocks.query.mock.calls.find(([sql]) => String(sql).startsWith("update itens"));
    expect(updateCall?.[0]).toContain("titulo = $1");
    expect(updateCall?.[1]).toEqual(["x'); DROP TABLE itens;--", 9]);

    mocks.query.mockClear();
    const invalid = response();
    await ritoHandler(request({ acao: "atualizarItem", id: 9, campos: { etapa: "execucao" } }) as never, invalid as never);
    expect(invalid.statusCode).toBe(400);
    expect(mocks.query.mock.calls.some(([sql]) => String(sql).startsWith("update itens"))).toBe(false);
  });

  it.each(["reach", "impact", "confidence", "effort"])("não limpa %s após o item avançar", async (field) => {
    const res = response();
    await ritoHandler(request({ acao: "atualizarItem", id: 9, campos: { [field]: null } }) as never, res as never);
    expect(res.statusCode).toBe(409);
    expect(mocks.query.mock.calls.map(([sql]) => sql)).toContain("rollback");
    expect(mocks.query.mock.calls.some(([sql]) => String(sql).startsWith("update itens"))).toBe(false);
    expect(mocks.release).toHaveBeenCalled();
  });

  it("trava a linha antes de validar e atualizar para evitar corrida com mover", async () => {
    const res = response();
    await ritoHandler(request({ acao: "atualizarItem", id: 9, campos: { titulo: "Atualizado" } }) as never, res as never);
    const sqls = mocks.query.mock.calls.map(([sql]) => String(sql).toLowerCase());
    const lock = sqls.findIndex((sql) => sql.includes("for update"));
    const update = sqls.findIndex((sql) => sql.startsWith("update itens"));
    expect(lock).toBeGreaterThan(sqls.findIndex((sql) => sql === "begin"));
    expect(update).toBeGreaterThan(lock);
    expect(res.statusCode).toBe(200);
  });

  it("não limpa R/I/C/E de item pausado", async () => {
    mocks.query.mockImplementation((sql: string) => /^select/i.test(sql.trim()) ? Promise.resolve({ rows: [{ ...item, etapa: "pausado" }] }) : Promise.resolve({}));
    const res = response();
    await ritoHandler(request({ acao: "atualizarItem", id: 9, campos: { reach: null } }) as never, res as never);
    expect(res.statusCode).toBe(409);
    expect(mocks.query.mock.calls.map(([sql]) => sql)).toContain("rollback");
    expect(mocks.query.mock.calls.some(([sql]) => String(sql).startsWith("update itens"))).toBe(false);
  });

  it.each([
    ["backlog", "discovery", { reach: null, impact: null, confidence: null, effort: null }, ""],
    ["discovery", "decidir", { effort: null }, ""],
    ["backlog", "descartado", {}, ""],
  ])("recusa mover de %s para %s sem pré-requisito e faz rollback sem gravar", async (etapa, para, campos, motivo) => {
    const itemInvalido = { ...item, etapa, ...campos, motivo };
    mocks.query.mockImplementation((sql: string) => /^select/i.test(sql.trim()) ? Promise.resolve({ rows: [itemInvalido] }) : Promise.resolve({}));
    const res = response();
    await ritoHandler(request({ acao: "mover", id: 9, para }) as never, res as never);
    expect(res.statusCode).toBe(409);
    expect(mocks.query.mock.calls.map(([sql]) => sql)).toContain("rollback");
    expect(mocks.query.mock.calls.some(([sql]) => String(sql).startsWith("update itens") || String(sql).startsWith("insert into movimentos"))).toBe(false);
  });
});
