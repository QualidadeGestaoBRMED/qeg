import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  isAuthed: vi.fn(),
  readJsonBody: vi.fn(),
  poolQuery: vi.fn(),
  poolConnect: vi.fn(),
  clientQuery: vi.fn(),
  release: vi.fn(),
}));

vi.mock("pg", () => ({
  default: {
    Pool: class {
      query(...args: unknown[]) {
        return mocks.poolQuery(...args);
      }

      connect() {
        return mocks.poolConnect();
      }
    },
  },
}));

vi.mock("../../api/_lib/server.js", () => ({
  isAuthed: mocks.isAuthed,
  json: (res: { statusCode?: number; body?: unknown }, status: number, body: unknown) => {
    res.statusCode = status;
    res.body = body;
  },
  readJsonBody: mocks.readJsonBody,
}));

import { ritoHandler } from "../../api/_lib/rito.js";

const item = {
  id: 11,
  areaId: 23,
  titulo: "texto livre confidencial",
  etapa: "backlog",
  reach: 1,
  impact: 1,
  confidence: 1,
  effort: null,
  motivo: "",
};

function resposta() {
  return { statusCode: 0, body: undefined };
}

function assertCamposPermitidos(line: string) {
  const parsed = JSON.parse(line);
  expect(Object.keys(parsed).sort()).toEqual(["action", "area", "duration_ms", "result"]);
  expect(line).not.toMatch(/email|token|body|password|confidencial|nota privada/i);
  return parsed;
}

describe("ritoHandler logging", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.DATABASE_URL = "postgresql://user:pass@localhost:5432/rito";
    mocks.isAuthed.mockReturnValue(true);
    mocks.poolQuery.mockImplementation(async (query: string) => (
      query.includes("from itens i where i.id = $1")
        ? { rows: [item], rowCount: 1 }
        : { rows: [], rowCount: 1 }
    ));
    mocks.clientQuery.mockImplementation(async (query: string) => (
      query.includes("from itens i where i.id = $1")
        ? { rows: [item], rowCount: 1 }
        : { rows: [], rowCount: 1 }
    ));
    mocks.poolConnect.mockResolvedValue({ query: mocks.clientQuery, release: mocks.release });
  });

  afterEach(() => vi.restoreAllMocks());

  it("logs one success line and gets the area from the returned item", async () => {
    mocks.readJsonBody.mockResolvedValue({ acao: "mover", id: 11, para: "discovery", nota: "nota privada" });
    const log = vi.spyOn(console, "log").mockImplementation(() => undefined);
    const res = resposta();

    await ritoHandler({ method: "POST", headers: {} } as never, res as never);

    expect(res.statusCode).toBe(200);
    expect(log).toHaveBeenCalledTimes(1);
    expect(assertCamposPermitidos(String(log.mock.calls[0][0]))).toMatchObject({
      action: "mover",
      area: 23,
      result: "ok",
    });
  });

  it("logs one success line and gets the area from the updated item", async () => {
    mocks.readJsonBody.mockResolvedValue({
      acao: "atualizarItem",
      id: 11,
      campos: { titulo: "texto livre confidencial" },
    });
    const log = vi.spyOn(console, "log").mockImplementation(() => undefined);
    const res = resposta();

    await ritoHandler({ method: "POST", headers: {} } as never, res as never);

    expect(res.statusCode).toBe(200);
    expect(log).toHaveBeenCalledTimes(1);
    expect(assertCamposPermitidos(String(log.mock.calls[0][0]))).toMatchObject({
      action: "atualizarItem",
      area: 23,
      result: "ok",
    });
  });

  it("logs one error line with null area for invalid input and no body text", async () => {
    mocks.readJsonBody.mockResolvedValue({
      acao: "dados",
      areaId: "private@example.com",
      token: "secret-token",
      text: "texto privado",
    });
    const log = vi.spyOn(console, "log").mockImplementation(() => undefined);
    const res = resposta();

    await ritoHandler({ method: "POST", headers: {} } as never, res as never);

    expect(res.statusCode).toBe(400);
    expect(log).toHaveBeenCalledTimes(1);
    expect(assertCamposPermitidos(String(log.mock.calls[0][0]))).toMatchObject({
      action: "dados",
      area: null,
      result: "error",
    });
  });
});
