import { createHmac } from "node:crypto";
import { EventEmitter } from "node:events";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ query: vi.fn(), connect: vi.fn(), release: vi.fn() }));
vi.mock("pg", () => ({ default: { Pool: vi.fn(() => ({ query: mocks.query, connect: mocks.connect })) } }));

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

  it("recusa mover sem os pré-requisitos e faz rollback sem gravar", async () => {
    const semScore = { ...item, etapa: "backlog", reach: null, impact: null, confidence: null };
    mocks.query.mockImplementation((sql: string) => /^select/i.test(sql.trim()) ? Promise.resolve({ rows: [semScore] }) : Promise.resolve({}));
    const res = response();
    await ritoHandler(request({ acao: "mover", id: 9, para: "discovery" }) as never, res as never);
    expect(res.statusCode).toBe(409);
    expect(mocks.query.mock.calls.map(([sql]) => sql)).toContain("rollback");
    expect(mocks.query.mock.calls.some(([sql]) => String(sql).startsWith("update itens") || String(sql).startsWith("insert into movimentos"))).toBe(false);
  });
});
