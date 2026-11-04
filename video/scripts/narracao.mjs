// Gera a narração do vídeo do rito com a ElevenLabs: um MP3 por cena + video/tour/narracao.json.
// Uso (na raiz do repo, com ELEVENLABS_API_KEY no .env e ffmpeg no PATH ou em FFMPEG):
//   node video/scripts/narracao.mjs gerar [--voz=ID]
// Reaproveita as falas que não mudaram (mesmo texto e mesma voz).
import { execFileSync, spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync } from "node:fs";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";

try {
  process.loadEnvFile();
} catch {
  // sem .env, usa o ambiente
}

const API = "https://api.elevenlabs.io/v1";
const MODELO = "eleven_multilingual_v2";
// Carla, a mesma voz brasileira do vídeo do Briefing Suporte.
const VOZ_PADRAO = "m151rjrbWXbBqyq56tly";
const PERFIL = { velocidade: 1.1, stability: 0.5, style: 0.35, acelerar: 1.03 };
const SAIDA = new URL("../tour/", import.meta.url);
const LUFS = -21;
const FFMPEG = process.env.FFMPEG || "ffmpeg";

// Uma fala por cena de video/rito.html, na mesma ordem. `marcas`: palavras cujo início sincroniza a animação.
// "RICE" escrito como se fala ("raice"); a tela mantém a grafia certa.
export const FALAS = [
  "Rito de priorização. Como a SOTEC decide o que construir, junto com cada área.",
  {
    texto:
      "Tudo começou num levantamento para o Suporte. Listamos tudo o que já tínhamos entregado. Mas, quando criamos as colunas de KPI e de score raice, elas ficaram vazias. A gente não tinha como preencher.",
    marcas: { vazias: "vazias" },
  },
  {
    texto:
      "Porque havia um impasse. O raice precisa do esforço. O esforço só sai de um discovery. E o discovery só acontece para o que já foi priorizado.",
    marcas: { esforco: "esforço só", discovery: "discovery só", priorizado: "priorizado" },
  },
  {
    texto:
      "A saída foi priorizar em dois momentos. Primeiro, alcance, impacto e confiança decidem onde vale a pena investir um discovery. O discovery traz o esforço. E só então o raice completo decide o que entra em execução.",
    marcas: { ric: "alcance", discovery: "O discovery", rice: "completo" },
  },
  {
    texto:
      "E onde fazer isso? Nós já tínhamos um painel de sprint, o Beacon. Só que ninguém abria. Um painel, ninguém abre. Um rito, todo mundo precisa abrir. Então o Beacon virou o rito.",
    marcas: { rito: "Um rito", virou: "virou" },
  },
  "Cada peça da tela foi pensada para guiar a reunião. Vamos montar.",
  "Tudo começa pela área. O rito é feito com a área, e a tela mostra só o que é dela.",
  {
    texto:
      "No quadro, quatro colunas contam a história de cada pedido: backlog, discovery, pronto para decidir, e execução. O resto fica recolhido, para não poluir a tela.",
    marcas: { backlog: "backlog", discovery: "discovery", decidir: "pronto", execucao: "execução", resto: "resto" },
  },
  {
    texto: "Cada card tem uma nota. Sem esforço, é o pré-score. Com esforço, vira o raice.",
    marcas: { pre: "Sem esforço", rice: "Com esforço" },
  },
  {
    texto:
      "Um clique abre o item. Alcance, impacto e confiança são escolhas fixas, com exemplos. Ninguém digita fórmula. E o próximo passo já aparece ali.",
    marcas: { rice: "Alcance", acoes: "próximo passo" },
  },
  {
    texto: "Quer descer o nível? Em mais detalhes estão a solução, os riscos, o card do Pipefy, e o histórico de cada decisão.",
    marcas: { pipefy: "card do Pipefy", historico: "histórico" },
  },
  "Em produtos, cada produto abre os projetos e as features que fazem parte dele.",
  {
    texto: "Na reunião, o modo rito conduz tudo em cinco passos. Primeiro, a execução: o que terminou, o que travou.",
    marcas: { passos: "cinco passos", execucao: "Primeiro" },
  },
  "Depois, o discovery. Com o esforço na mão, decide-se: entra em execução, ou agora não.",
  "Na triagem, o que chegou de novo ganha alcance, impacto e confiança, ali mesmo, com a área.",
  "Na escolha, o backlog aparece em ordem. E a área vê, na hora, por que algo foi escolhido, ou não.",
  "Ao encerrar, a ata se escreve sozinha, com cada decisão do dia.",
  {
    texto:
      "E entre as áreas? Isso fica para a reunião interna, com todas lado a lado. O raice decide dentro da área. A estratégia decide entre as áreas.",
    marcas: { estrategia: "A estratégia" },
  },
  "A área não manda um pedido e espera. Ela senta e prioriza com a gente. Rito de priorização.",
];

const chave = process.env.ELEVENLABS_API_KEY?.trim();
const arg = (k) => process.argv.find((a) => a.startsWith(`--${k}=`))?.slice(k.length + 3);

function nivelar(arquivo, acelerar = 1) {
  const caminho = fileURLToPath(new URL(arquivo, SAIDA)), alvo = `I=${LUFS}:TP=-1.5:LRA=11`, tempo = acelerar !== 1 ? `atempo=${acelerar},` : "";
  const log = spawnSync(FFMPEG, ["-hide_banner", "-i", caminho, "-af", `${tempo}loudnorm=${alvo}:print_format=json`, "-f", "null", "-"], { encoding: "utf8" }).stderr;
  const ini = log.lastIndexOf("{"), m = JSON.parse(log.slice(ini, log.indexOf("}", ini) + 1));
  const tmp = caminho.replace(/\.mp3$/, ".nivel.mp3");
  execFileSync(FFMPEG, ["-y", "-hide_banner", "-loglevel", "error", "-i", caminho, "-af",
    `${tempo}loudnorm=${alvo}:measured_I=${m.input_i}:measured_TP=${m.input_tp}:measured_LRA=${m.input_lra}:measured_thresh=${m.input_thresh}:offset=${m.target_offset}:linear=true`,
    "-ar", "44100", "-c:a", "libmp3lame", "-b:a", "128k", tmp]);
  execFileSync("mv", [tmp, caminho]);
}

async function gerar() {
  if (!chave) throw new Error("Defina ELEVENLABS_API_KEY no .env.");
  const voz = arg("voz") ?? process.env.ELEVENLABS_VOICE_ID?.trim() ?? VOZ_PADRAO;
  await mkdir(SAIDA, { recursive: true });
  const manifesto = new URL("narracao.json", SAIDA);
  const antigas = existsSync(manifesto) ? JSON.parse(await readFile(manifesto, "utf8")) : null;
  const prontas = antigas?.voz === voz ? antigas.falas : [];
  const textos = FALAS.map((f) => (typeof f === "string" ? f : f.texto));
  const falas = [];
  for (const [i, fala] of FALAS.entries()) {
    const texto = textos[i], marcasPedidas = typeof fala === "string" ? null : fala.marcas;
    const pronta = prontas.find((f) => f.texto === texto && existsSync(new URL(f.arquivo, SAIDA)));
    if (pronta && (!marcasPedidas || (pronta.marcas && Object.keys(marcasPedidas).every((k) => k in pronta.marcas)))) {
      falas.push(pronta);
      console.log(`${pronta.arquivo}  reaproveitada`);
      continue;
    }
    const r = await fetch(`${API}/text-to-speech/${voz}/with-timestamps?output_format=mp3_44100_128`, {
      method: "POST",
      headers: { "xi-api-key": chave, "Content-Type": "application/json" },
      body: JSON.stringify({
        text: texto,
        model_id: MODELO,
        language_code: "pt",
        previous_text: textos[i - 1],
        next_text: textos[i + 1],
        voice_settings: { stability: PERFIL.stability, similarity_boost: 0.8, style: PERFIL.style, use_speaker_boost: true, speed: PERFIL.velocidade },
      }),
    });
    if (!r.ok) throw new Error(`ElevenLabs ${r.status}: ${(await r.text()).slice(0, 300)}`);
    const d = await r.json();
    const arquivo = `fala-${createHash("sha1").update(voz + JSON.stringify(PERFIL) + texto).digest("hex").slice(0, 10)}.mp3`;
    await writeFile(new URL(arquivo, SAIDA), Buffer.from(d.audio_base64, "base64"));
    nivelar(arquivo, PERFIL.acelerar);
    const al = d.alignment, fim = al?.character_end_times_seconds?.at(-1) ?? 0;
    const item = { arquivo, duracao: Math.round((fim / PERFIL.acelerar + 0.15) * 100) / 100, texto };
    if (marcasPedidas && al) {
      const dito = al.characters.join("");
      item.marcas = Object.fromEntries(
        Object.entries(marcasPedidas).map(([k, p]) => [k, dito.includes(p) ? Math.round((al.character_start_times_seconds[dito.indexOf(p)] / PERFIL.acelerar) * 1000) / 1000 : null]),
      );
    }
    falas.push(item);
    console.log(`${arquivo}  ${item.duracao}s  ${texto.slice(0, 60)}`);
  }
  await writeFile(manifesto, JSON.stringify({ voz, modelo: MODELO, gerado_em: new Date().toISOString(), falas }, null, 2));
  console.log(`\n${falas.length} falas em video/tour/.`);
}

if (process.argv[2] !== "gerar") {
  console.error("Uso: node video/scripts/narracao.mjs gerar [--voz=ID]");
  process.exit(1);
}
gerar().catch((e) => {
  console.error(e.message);
  process.exit(1);
});
