// Smoke do Preview: BASE_URL, SMOKE_USERNAME e SMOKE_PASSWORD vêm do ambiente; nada disso é impresso.
//   BASE_URL=https://... SMOKE_USERNAME=... SMOKE_PASSWORD=... npm run smoke:preview [-- --cleanup]
import { coldStartStatus, formatReport, parseArgs, runSteps } from "./preview-smoke-lib.mjs";

const config = parseArgs(process.argv.slice(2), process.env);
if (config.erros.length) {
  console.error(config.erros.join("\n"));
  process.exit(2);
}
const { baseUrl, username, password, cleanup, area } = config;

let cookie = "";
const marca = `[smoke-preview ${new Date().toISOString().slice(0, 19)}]`;
const estado = {};

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

const mover = async (para, nota = "") => {
  const { item } = await rito("mover", { id: estado.itemId, para, nota, ritoId: estado.ritoId });
  if (item.etapa !== para) throw new Error(`etapa esperada ${para}, veio ${item.etapa}`);
};

const passos = [
  {
    nome: "Cold start da função: 1ª chamada a /api/rito (sem sessão)",
    async executar() {
      const inicio = Date.now();
      const res = await post("/api/rito", { acao: "areas" }, false);
      const ms = Date.now() - inicio;
      if (res.status !== 401) throw new Error(`esperado 401 sem sessão, veio HTTP ${res.status}`);
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
      const alvo = areas.find((a) => a.nome === area);
      if (!alvo) throw new Error(`área "${area}" não encontrada (defina SMOKE_AREA)`);
      estado.areaId = alvo.id;
      const r = coldStartStatus(ms);
      return { status: r.status, detalhe: `${ms} ms${r.detalhe ? `, ${r.detalhe}` : ""}` };
    },
  },
  {
    nome: "criarProduto",
    async executar() {
      const { id } = await rito("criarProduto", { areaId: estado.areaId, nome: `${marca} produto`, descricao: "Teste de preview" });
      estado.produtoId = id;
    },
  },
  {
    nome: "iniciarRito",
    async executar() {
      const { rito: r } = await rito("iniciarRito", { areaId: estado.areaId });
      estado.ritoId = r.id;
      return { detalhe: "rito aberto" };
    },
  },
  {
    nome: "criarItem (backlog)",
    async executar() {
      const { item } = await rito("criarItem", {
        areaId: estado.areaId,
        produtoId: estado.produtoId,
        titulo: `${marca} feature`,
        problema: "Teste de preview",
        ritoId: estado.ritoId,
        reach: 10,
        impact: 1,
        confidence: 0.8,
      });
      estado.itemId = item.id;
      if (item.etapa !== "backlog") throw new Error(`etapa inicial ${item.etapa}`);
    },
  },
  { nome: "mover: discovery", executar: () => mover("discovery") },
  {
    nome: "atualizarItem: esforço",
    async executar() {
      await rito("atualizarItem", { id: estado.itemId, campos: { effort: 2 } });
    },
  },
  { nome: "mover: decidir", executar: () => mover("decidir") },
  { nome: "mover: execução", executar: () => mover("execucao") },
  { nome: "pausar", executar: () => mover("pausado", "teste de preview") },
  { nome: "retomar", executar: () => mover("execucao") },
  { nome: "entregue", executar: () => mover("entregue") },
  {
    nome: "encerrarRito com ata",
    async executar() {
      const { ata } = await rito("encerrarRito", { id: estado.ritoId });
      if (!ata?.includes("Entregues")) throw new Error("ata sem a seção de entregues");
      return { detalhe: `ata com ${ata.split("\n").length} linhas` };
    },
  },
];

if (cleanup) {
  passos.push({
    nome: "cleanup: descartar item auxiliar",
    async executar() {
      const { item } = await rito("criarItem", { areaId: estado.areaId, produtoId: estado.produtoId, titulo: `${marca} auxiliar` });
      estado.itemId = item.id;
      await rito("mover", { id: item.id, para: "descartado", nota: "teste de preview" });
      return { detalhe: "item entregue não pode ser descartado; ele e o produto ficam identificáveis pelo prefixo [smoke-preview]" };
    },
  });
}

const resultados = await runSteps(passos, [password, username.length >= 4 ? username : ""].filter(Boolean));
console.log(formatReport(resultados, { baseUrl, cleanup }));
process.exit(resultados.some((p) => p.status === "falha") ? 1 : 0);
