import { EventEmitter } from "node:events";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ query: vi.fn(), connect: vi.fn() }));
vi.mock("pg", () => ({
  default: {
    Pool: vi.fn(() => Object.assign(new EventEmitter(), { query: mocks.query, connect: mocks.connect })),
  },
}));

import { ritoHandler } from "./rito.js";
import { loginHandler, pipefyHandler, sessionHandler } from "./server.js";

type Res = { statusCode: number; headers: Record<string, string>; body: string; setHeader(k: string, v: string): void; end(v: string): void };
function response(): Res {
  return { statusCode: 0, headers: {}, body: "", setHeader(k, v) { this.headers[k] = v; }, end(v) { this.body = v; } };
}
function request(body: unknown, cookie?: string) {
  const req = new EventEmitter() as EventEmitter & { method: string; headers: Record<string, string>; body: unknown };
  req.method = "POST";
  req.headers = cookie ? { cookie } : {};
  req.body = body;
  return req;
}

async function entrar(username: string, password: string) {
  const res = response();
  await loginHandler(request({ username, password }) as never, res as never);
  const cookie = (res.headers["Set-Cookie"] ?? "").split(";")[0];
  return { res, cookie };
}

describe("contas de área", () => {
  beforeEach(() => {
    process.env.SESSION_SECRET = "segredo-de-teste";
    process.env.AUTH_USERNAME = "admin";
    process.env.AUTH_PASSWORD = "senha-admin";
    process.env.AUTH_CONTAS = JSON.stringify([{ usuario: "suporte", senha: "senha-suporte", areaId: 1 }]);
    process.env.DATABASE_URL = "postgres://localhost/test";
    mocks.query.mockReset();
    // Item 9 é do Suporte (área 1), item 7 é de outra área; rito 3 é do Suporte.
    mocks.query.mockImplementation((sql: string, args: unknown[] = []) => {
      if (sql.includes("from areas")) return Promise.resolve({ rows: [{ id: 1, nome: "Suporte" }, { id: 2, nome: "Sales" }] });
      if (sql.startsWith("select area_id from itens")) return Promise.resolve({ rows: [{ area_id: args[0] === 9 ? 1 : 2 }] });
      if (sql.startsWith("select area_id from ritos")) return Promise.resolve({ rows: [{ area_id: args[0] === 3 ? 1 : null }] });
      if (sql.includes("from produto_areas where produto_id")) return Promise.resolve({ rows: args[0] === 5 ? [{}] : [] });
      return Promise.resolve({ rows: [] });
    });
  });
  afterEach(() => {
    delete process.env.AUTH_CONTAS;
    vi.clearAllMocks();
  });

  it("entra com a conta de área e a sessão devolve a área", async () => {
    const { res, cookie } = await entrar("suporte", "senha-suporte");
    expect(res.statusCode).toBe(200);
    expect(JSON.parse(res.body).conta).toEqual({ usuario: "suporte", areaId: 1 });

    const sessao = response();
    await sessionHandler(request({}, cookie) as never, sessao as never);
    expect(JSON.parse(sessao.body)).toEqual({ authed: true, conta: { usuario: "suporte", areaId: 1 } });
  });

  it("recusa senha errada e mantém o login principal sem restrição", async () => {
    expect((await entrar("suporte", "errada")).res.statusCode).toBe(401);
    const { res } = await entrar("admin", "senha-admin");
    expect(JSON.parse(res.body).conta).toEqual({ usuario: "admin", areaId: null });
  });

  it("derruba a sessão quando a conta sai de AUTH_CONTAS", async () => {
    const { cookie } = await entrar("suporte", "senha-suporte");
    process.env.AUTH_CONTAS = "[]";
    const sessao = response();
    await sessionHandler(request({}, cookie) as never, sessao as never);
    expect(sessao.statusCode).toBe(401);
  });

  it("lista só a própria área", async () => {
    const { cookie } = await entrar("suporte", "senha-suporte");
    const res = response();
    await ritoHandler(request({ acao: "areas" }, cookie) as never, res as never);
    expect(JSON.parse(res.body).areas).toEqual([{ id: 1, nome: "Suporte" }]);
  });

  it.each([
    ["dados de outra área", { acao: "dados", areaId: 2 }],
    ["reunião interna", { acao: "dados", areaId: null }],
    ["item de outra área", { acao: "atualizarItem", id: 7, campos: { titulo: "x" } }],
    ["mover item de outra área", { acao: "mover", id: 7, para: "descartado", nota: "x" }],
    ["produto de outra área", { acao: "criarItem", areaId: 1, titulo: "x", produtoId: 6 }],
    ["rito interno", { acao: "iniciarRito", areaId: null }],
    ["encerrar rito de outra área", { acao: "encerrarRito", id: 4 }],
  ])("nega %s com 403", async (_nome, corpo) => {
    const { cookie } = await entrar("suporte", "senha-suporte");
    const res = response();
    await ritoHandler(request(corpo, cookie) as never, res as never);
    expect(res.statusCode).toBe(403);
    expect(mocks.query.mock.calls.some(([sql]) => /^(update|insert)/.test(String(sql).trim()))).toBe(false);
  });

  it("deixa ler e editar o que é da própria área", async () => {
    const { cookie } = await entrar("suporte", "senha-suporte");
    const dados = response();
    await ritoHandler(request({ acao: "dados", areaId: 1 }, cookie) as never, dados as never);
    expect(dados.statusCode).toBe(200);
    const historico = response();
    await ritoHandler(request({ acao: "historico", id: 9 }, cookie) as never, historico as never);
    expect(historico.statusCode).toBe(200);
  });

  it("não usa o Pipefy", async () => {
    const { cookie } = await entrar("suporte", "senha-suporte");
    const res = response();
    await pipefyHandler(request({ query: "{ me { id } }" }, cookie) as never, res as never);
    expect(res.statusCode).toBe(403);
  });
});
