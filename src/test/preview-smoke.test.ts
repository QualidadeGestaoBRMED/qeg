import { describe, expect, it } from "vitest";
import { classificarPrimeiraChamada, coldStartStatus, formatReport, parseArgs, PREVIEW_PROTEGIDO, redact, runSteps } from "../../scripts/preview-smoke-lib.mjs";

const env = { BASE_URL: "https://preview.example.com/", SMOKE_USERNAME: "tester", SMOKE_PASSWORD: "s3cret-pass", SMOKE_BLOCKED_HOSTS: "production.example.com" };

describe("parseArgs", () => {
  it("lê o ambiente e normaliza a URL", () => {
    expect(parseArgs([], env)).toMatchObject({ baseUrl: "https://preview.example.com", erros: [] });
  });

  it("rejeita a antiga opção de limpeza", () => {
    expect(parseArgs(["--cleanup"], env).erros).toContain("Argumento desconhecido: --cleanup");
  });

  it("reporta variáveis ausentes, URL inválida e argumentos desconhecidos", () => {
    expect(parseArgs([], {}).erros).toEqual(["Defina BASE_URL.", "Defina SMOKE_USERNAME e SMOKE_PASSWORD."]);
    expect(parseArgs(["--x"], { ...env, BASE_URL: "https://a.com/caminho" }).erros).toEqual([
      "Argumento desconhecido: --x",
      "BASE_URL deve ser uma origem http(s), sem caminho.",
    ]);
  });
});

describe("trava contra Production", () => {
  it("recusa VERCEL_ENV=production e hosts bloqueados, inclusive subdomínios", () => {
    expect(parseArgs([], { ...env, VERCEL_ENV: "production" }).bloqueio).toMatch(/VERCEL_ENV=production/);
    const bloqueados = { ...env, BASE_URL: "https://app.Prod.example.com", SMOKE_BLOCKED_HOSTS: " other.com, PROD.example.com " };
    expect(parseArgs([], bloqueados).bloqueio).toMatch(/SMOKE_BLOCKED_HOSTS \(prod.example.com\)/);
    expect(parseArgs([], { ...bloqueados, BASE_URL: "https://prod.example.com" }).bloqueio).toMatch(/SMOKE_BLOCKED_HOSTS/);
    expect(parseArgs([], { ...bloqueados, BASE_URL: "https://notprod.example.com" }).bloqueio).toBeNull();
  });

  it("exige lista não vazia, salvo com --allow-production", () => {
    for (const hosts of [undefined, "", " ,  , "]) {
      expect(parseArgs([], { ...env, SMOKE_BLOCKED_HOSTS: hosts }).bloqueio).toMatch(/Defina SMOKE_BLOCKED_HOSTS/);
      expect(parseArgs(["--allow-production"], { ...env, SMOKE_BLOCKED_HOSTS: hosts }).bloqueio).toBeNull();
    }
  });

  it("libera só com --allow-production e deixa passar um Preview comum", () => {
    expect(parseArgs([], env).bloqueio).toBeNull();
    const producao = { ...env, VERCEL_ENV: "production", SMOKE_BLOCKED_HOSTS: "preview.example.com" };
    expect(parseArgs([], producao).bloqueio).not.toBeNull();
    expect(parseArgs(["--allow-production"], producao)).toMatchObject({ allowProduction: true, bloqueio: null, erros: [] });
  });
});

describe("classificarPrimeiraChamada", () => {
  it("aceita só o 401 JSON da API", () => {
    expect(classificarPrimeiraChamada({ status: 401, contentType: "application/json; charset=utf-8", corpo: { error: "Não autenticado." } })).toEqual({ ok: true });
  });

  it("trata o 401 HTML da proteção da Vercel como Preview protegido", () => {
    expect(classificarPrimeiraChamada({ status: 401, contentType: "text/html", corpo: null })).toEqual({ ok: false, mensagem: PREVIEW_PROTEGIDO });
    expect(classificarPrimeiraChamada({ status: 401, contentType: "application/json", corpo: {} })).toEqual({ ok: false, mensagem: PREVIEW_PROTEGIDO });
    expect(classificarPrimeiraChamada({ status: 401, contentType: null, corpo: { error: "x" } }).ok).toBe(false);
  });

  it("rejeita status diferente de 401", () => {
    expect(classificarPrimeiraChamada({ status: 200, contentType: "application/json", corpo: { error: "x" } })).toEqual({ ok: false, mensagem: "esperado 401 sem sessão, veio HTTP 200" });
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
    const relatorio = formatReport(passos, { baseUrl: "https://preview.example.com" });
    expect(relatorio).not.toContain("s3cret-pass");
    expect(relatorio).toContain("FAIL dois");
    expect(relatorio).toContain("SKIP tres");
    expect(relatorio).toContain("Resultado: FALHOU (1 falha(s), 0 aviso(s))");
  });

  it("conta avisos como aprovação", () => {
    const relatorio = formatReport([{ nome: "cold", status: "aviso", detalhe: "4000 ms", ms: 4000 }], { baseUrl: "https://x.com" });
    expect(relatorio).toContain("(somente leitura)");
    expect(relatorio).toContain("Resultado: PASSOU (1 aviso(s))");
  });

  it("mostra os dois tempos de cold start e avisa cada um acima de 3 s", async () => {
    const passos = await runSteps([
      { nome: "Cold start da função", executar: async () => ({ ...coldStartStatus(1200), detalhe: "1200 ms" }) },
      { nome: "Primeira consulta ao banco", executar: async () => ({ ...coldStartStatus(4500), detalhe: "4500 ms, acima de 3 s" }) },
    ]);
    const relatorio = formatReport(passos, { baseUrl: "https://x.com" });
    expect(relatorio).toContain("OK   Cold start da função");
    expect(relatorio).toContain("1200 ms");
    expect(relatorio).toContain("WARN Primeira consulta ao banco");
    expect(relatorio).toContain("4500 ms, acima de 3 s");
    expect(relatorio).toContain("Resultado: PASSOU (1 aviso(s))");
  });

  it("redact troca todas as ocorrências", () => {
    expect(redact("a b a", ["a"])).toBe("*** b ***");
  });
});
