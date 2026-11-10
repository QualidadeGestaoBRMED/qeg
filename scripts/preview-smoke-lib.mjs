export const COLD_START_LIMIT_MS = 3000;

export function parseArgs(argv, env) {
  const erros = [];
  const allowProduction = argv.includes("--allow-production");
  for (const arg of argv) if (arg !== "--allow-production") erros.push(`Argumento desconhecido: ${arg}`);
  const baseUrl = (env.BASE_URL ?? "").trim().replace(/\/+$/, "");
  if (!baseUrl) erros.push("Defina BASE_URL.");
  else if (!/^https?:\/\/[^/\s]+$/.test(baseUrl)) erros.push("BASE_URL deve ser uma origem http(s), sem caminho.");
  const username = env.SMOKE_USERNAME ?? "";
  const password = env.SMOKE_PASSWORD ?? "";
  if (!username || !password) erros.push("Defina SMOKE_USERNAME e SMOKE_PASSWORD.");
  const bloqueio = allowProduction || erros.length ? null : bloqueioDeProducao(baseUrl, env);
  return { baseUrl, username, password, allowProduction, erros, bloqueio };
}

/** Motivo para recusar o smoke contra Production; null quando pode rodar. */
export function bloqueioDeProducao(baseUrl, env) {
  const aviso = "Use --allow-production só na STC-1007.";
  if (env.VERCEL_ENV === "production") return `VERCEL_ENV=production: o smoke do Preview não roda em Production. ${aviso}`;
  const host = new URL(baseUrl).hostname.toLowerCase();
  const bloqueados = (env.SMOKE_BLOCKED_HOSTS ?? "").split(",").map((h) => h.trim().toLowerCase()).filter(Boolean);
  if (!bloqueados.length) return `Defina SMOKE_BLOCKED_HOSTS com os domínios de Production. ${aviso}`;
  const hit = bloqueados.find((h) => host === h || host.endsWith(`.${h}`));
  return hit ? `O host ${host} está em SMOKE_BLOCKED_HOSTS (${hit}). ${aviso}` : null;
}

export const PREVIEW_PROTEGIDO = "Preview protegido: configure o acesso ao deployment";

/** O 1º passo precisa de um 401 JSON da própria API; o 401 HTML da proteção da Vercel não vale. */
export function classificarPrimeiraChamada({ status, contentType, corpo }) {
  if (status !== 401) return { ok: false, mensagem: `esperado 401 sem sessão, veio HTTP ${status}` };
  const json = /application\/json/i.test(contentType ?? "");
  if (!json || typeof corpo?.error !== "string") return { ok: false, mensagem: PREVIEW_PROTEGIDO };
  return { ok: true };
}

export function redact(texto, segredos) {
  let saida = String(texto);
  for (const segredo of segredos) if (segredo) saida = saida.split(segredo).join("***");
  return saida;
}

export function formatReport(passos, { baseUrl }) {
  const icone = { ok: "OK  ", aviso: "WARN", falha: "FAIL", pulado: "SKIP" };
  const linhas = [`Smoke do Preview: ${baseUrl} (somente leitura)`, ""];
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
