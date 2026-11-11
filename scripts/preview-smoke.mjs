// Smoke do Preview: BASE_URL, SMOKE_USERNAME e SMOKE_PASSWORD vêm do ambiente; nada disso é impresso.
//   BASE_URL=https://... SMOKE_USERNAME=... SMOKE_PASSWORD=... npm run smoke:preview
// Exige SMOKE_BLOCKED_HOSTS e recusa Production (VERCEL_ENV=production ou host listado); só --allow-production libera.
import { classificarPrimeiraChamada, coldStartStatus, formatReport, parseArgs, runSteps } from "./preview-smoke-lib.mjs";

const config = parseArgs(process.argv.slice(2), process.env);
if (config.erros.length) {
  console.error(config.erros.join("\n"));
  process.exit(2);
}
if (config.bloqueio) {
  console.error(config.bloqueio);
  process.exit(1);
}
const { baseUrl, username, password } = config;

let cookie = "";

async function post(caminho, corpo, comCookie = true) {
  return fetch(`${baseUrl}${caminho}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...(comCookie && cookie ? { Cookie: cookie } : {}) },
    body: JSON.stringify(corpo),
  });
}

async function rito(acao, dados = {}) {
  const res = await post("/api/rito", { acao, ...dados });
  const corpo = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(`${acao}: HTTP ${res.status}${corpo.error ? ` - ${corpo.error}` : ""}`);
  return corpo;
}

const passos = [
  {
    nome: "Cold start da função: 1ª chamada a /api/rito (sem sessão)",
    async executar() {
      const inicio = Date.now();
      const res = await post("/api/rito", { acao: "areas" }, false);
      const ms = Date.now() - inicio;
      const corpo = await res.json().catch(() => null);
      const veredito = classificarPrimeiraChamada({ status: res.status, contentType: res.headers.get("content-type"), corpo });
      if (!veredito.ok) throw new Error(veredito.mensagem);
      const r = coldStartStatus(ms);
      return { status: r.status, detalhe: `${ms} ms${r.detalhe ? `, ${r.detalhe}` : ""}` };
    },
  },
  {
    nome: "Login",
    async executar() {
      const res = await post("/api/login", { username, password }, false);
      if (!res.ok) throw new Error(`login: HTTP ${res.status}`);
      cookie = res.headers.getSetCookie().map((c) => c.split(";")[0]).join("; ");
      if (!cookie) throw new Error("login sem cookie de sessão");
    },
  },
  {
    nome: "Sessão válida",
    async executar() {
      const res = await fetch(`${baseUrl}/api/session`, { headers: { Cookie: cookie } });
      const corpo = await res.json().catch(() => ({}));
      if (res.status !== 200 || corpo.authed !== true) throw new Error(`sessão: HTTP ${res.status}`);
    },
  },
  {
    nome: "Primeira consulta ao banco: areas (após o login)",
    async executar() {
      const inicio = Date.now();
      const { areas } = await rito("areas");
      const ms = Date.now() - inicio;
      if (!Array.isArray(areas)) throw new Error("resposta de areas inválida");
      const r = coldStartStatus(ms);
      return { status: r.status, detalhe: `${ms} ms${r.detalhe ? `, ${r.detalhe}` : ""}` };
    },
  },
];

const resultados = await runSteps(passos, [password, username.length >= 4 ? username : ""].filter(Boolean));
console.log(formatReport(resultados, { baseUrl }));
process.exit(resultados.some((p) => p.status === "falha") ? 1 : 0);
