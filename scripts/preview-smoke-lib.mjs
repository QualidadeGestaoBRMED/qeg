export const COLD_START_LIMIT_MS = 3000;

export function parseArgs(argv, env) {
  const erros = [];
  const cleanup = argv.includes("--cleanup");
  for (const arg of argv) if (arg !== "--cleanup") erros.push(`Argumento desconhecido: ${arg}`);
  const baseUrl = (env.BASE_URL ?? "").trim().replace(/\/+$/, "");
  if (!baseUrl) erros.push("Defina BASE_URL.");
  else if (!/^https?:\/\/[^/\s]+$/.test(baseUrl)) erros.push("BASE_URL deve ser uma origem http(s), sem caminho.");
  const username = env.SMOKE_USERNAME ?? "";
  const password = env.SMOKE_PASSWORD ?? "";
  if (!username || !password) erros.push("Defina SMOKE_USERNAME e SMOKE_PASSWORD.");
  return { baseUrl, username, password, cleanup, area: env.SMOKE_AREA || "Suporte", erros };
}

export function redact(texto, segredos) {
  let saida = String(texto);
  for (const segredo of segredos) if (segredo) saida = saida.split(segredo).join("***");
  return saida;
}

export function formatReport(passos, { baseUrl, cleanup }) {
  const icone = { ok: "OK  ", aviso: "WARN", falha: "FAIL", pulado: "SKIP" };
  const linhas = [`Smoke do Preview: ${baseUrl}${cleanup ? " (com --cleanup)" : ""}`, ""];
  passos.forEach((p, i) => {
    const tempo = p.ms == null ? "" : ` (${p.ms} ms)`;
    const detalhe = p.detalhe ? ` - ${p.detalhe}` : "";
    linhas.push(`${String(i + 1).padStart(2)}. ${icone[p.status]} ${p.nome}${tempo}${detalhe}`);
  });
  const falhas = passos.filter((p) => p.status === "falha").length;
  const avisos = passos.filter((p) => p.status === "aviso").length;
  linhas.push("", falhas ? `Resultado: FALHOU (${falhas} falha(s), ${avisos} aviso(s))` : `Resultado: PASSOU (${avisos} aviso(s))`);
  return linhas.join("\n");
}

export function coldStartStatus(ms) {
  return ms > COLD_START_LIMIT_MS
    ? { status: "aviso", detalhe: `acima de ${COLD_START_LIMIT_MS / 1000} s` }
    : { status: "ok", detalhe: "" };
}

/** Executa os passos em ordem; depois da primeira falha, marca o resto como pulado. */
export async function runSteps(definicoes, segredos = []) {
  const resultados = [];
  let parou = false;
  for (const { nome, executar } of definicoes) {
    if (parou) {
      resultados.push({ nome, status: "pulado" });
      continue;
    }
    const inicio = Date.now();
    try {
      const r = (await executar()) ?? {};
      resultados.push({ nome, status: r.status ?? "ok", detalhe: r.detalhe ? redact(r.detalhe, segredos) : "", ms: Date.now() - inicio });
    } catch (e) {
      resultados.push({ nome, status: "falha", detalhe: redact(e instanceof Error ? e.message : e, segredos), ms: Date.now() - inicio });
      parou = true;
    }
  }
  return resultados;
}
