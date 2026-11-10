import { describe, expect, it } from "vitest";
import { coldStartStatus, formatReport, parseArgs, redact, runSteps } from "../../scripts/preview-smoke-lib.mjs";

const env = { BASE_URL: "https://preview.example.com/", SMOKE_USERNAME: "tester", SMOKE_PASSWORD: "s3cret-pass" };

describe("parseArgs", () => {
  it("lê o ambiente e normaliza a URL", () => {
    expect(parseArgs([], env)).toMatchObject({ baseUrl: "https://preview.example.com", cleanup: false, area: "Suporte", erros: [] });
  });

  it("aceita --cleanup e SMOKE_AREA", () => {
    expect(parseArgs(["--cleanup"], { ...env, SMOKE_AREA: "Sales" })).toMatchObject({ cleanup: true, area: "Sales", erros: [] });
  });

  it("reporta variáveis ausentes, URL inválida e argumentos desconhecidos", () => {
    expect(parseArgs([], {}).erros).toEqual(["Defina BASE_URL.", "Defina SMOKE_USERNAME e SMOKE_PASSWORD."]);
    expect(parseArgs(["--x"], { ...env, BASE_URL: "https://a.com/caminho" }).erros).toEqual([
      "Argumento desconhecido: --x",
      "BASE_URL deve ser uma origem http(s), sem caminho.",
    ]);
  });
});

describe("coldStartStatus", () => {
  it("avisa acima de 3 s", () => {
    expect(coldStartStatus(3000).status).toBe("ok");
    expect(coldStartStatus(3001)).toEqual({ status: "aviso", detalhe: "acima de 3 s" });
  });
});

describe("runSteps e formatReport", () => {
  it("para na primeira falha, pula o resto e não vaza segredos", async () => {
    const passos = await runSteps(
      [
        { nome: "um", executar: async () => ({ detalhe: "feito" }) },
        { nome: "dois", executar: async () => { throw new Error("login com s3cret-pass falhou"); } },
        { nome: "tres", executar: async () => undefined },
      ],
      [env.SMOKE_PASSWORD],
    );
    expect(passos.map((p) => p.status)).toEqual(["ok", "falha", "pulado"]);
    const relatorio = formatReport(passos, { baseUrl: "https://preview.example.com", cleanup: false });
    expect(relatorio).not.toContain("s3cret-pass");
    expect(relatorio).toContain("FAIL dois");
    expect(relatorio).toContain("SKIP tres");
    expect(relatorio).toContain("Resultado: FALHOU (1 falha(s), 0 aviso(s))");
  });

  it("conta avisos como aprovação", () => {
    const relatorio = formatReport([{ nome: "cold", status: "aviso", detalhe: "4000 ms", ms: 4000 }], { baseUrl: "https://x.com", cleanup: true });
    expect(relatorio).toContain("(com --cleanup)");
    expect(relatorio).toContain("Resultado: PASSOU (1 aviso(s))");
  });

  it("redact troca todas as ocorrências", () => {
    expect(redact("a b a", ["a"])).toBe("*** b ***");
  });
});
