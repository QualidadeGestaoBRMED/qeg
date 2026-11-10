import { afterEach, describe, expect, it, vi } from "vitest";
import { aoExpirarSessao } from "@/features/auth/sessionEvents";
import { ritoApi } from "./api";

const resposta = (status: number, corpo: unknown) =>
  Promise.resolve(new Response(JSON.stringify(corpo), { status, headers: { "Content-Type": "application/json" } }));

afterEach(() => vi.unstubAllGlobals());

describe("ritoApi e sessão expirada", () => {
  it("avisa a sessão expirada num 401 de /api/rito e rejeita com mensagem clara", async () => {
    vi.stubGlobal("fetch", vi.fn(() => resposta(401, { error: "Não autenticado." })));
    const expirou = vi.fn();
    const parar = aoExpirarSessao(expirou);
    await expect(ritoApi.areas()).rejects.toThrow("Sessão expirada. Entre novamente.");
    expect(expirou).toHaveBeenCalledTimes(1);
    parar();
  });

  it("não aciona o fluxo de sessão em outros erros", async () => {
    vi.stubGlobal("fetch", vi.fn(() => resposta(409, { error: "Bloqueado." })));
    const expirou = vi.fn();
    const parar = aoExpirarSessao(expirou);
    await expect(ritoApi.mover(1, "discovery")).rejects.toThrow("Bloqueado.");
    expect(expirou).not.toHaveBeenCalled();
    parar();
  });

  it("deixa de notificar quem se desinscreveu", async () => {
    vi.stubGlobal("fetch", vi.fn(() => resposta(401, {})));
    const expirou = vi.fn();
    aoExpirarSessao(expirou)();
    await expect(ritoApi.areas()).rejects.toThrow();
    expect(expirou).not.toHaveBeenCalled();
  });
});
