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
// Roberta ("Casual Sales"), escolhida pelo Gabriel em 2026-11-04.
const VOZ_PADRAO = "ohZOfA9iwlZ5nOsoY7LB";
const PERFIL = { velocidade: 1.1, stability: 0.5, style: 0.35, acelerar: 1.03 };
const SAIDA = new URL("../tour/", import.meta.url);
const LUFS = -21;
const FFMPEG = process.env.FFMPEG || "ffmpeg";

// Uma fala por cena de video/rito.html, na mesma ordem. `marcas`: palavras cujo início sincroniza a animação.
// Palavras escritas como se falam: "ráice" (RICE), "discouveri" (discovery); a tela mantém a grafia certa.
export const FALAS = [
  "Rito de priorização: como a SOTEC decide o que construir, junto com cada área.",
  {
    texto:
      "Para priorizar com ráice, precisamos do esforço. Mas o esforço só sai de um discouveri. Então priorizamos em dois momentos: primeiro, o que vale entender; depois, o que vale construir.",
    marcas: { primeiro: "primeiro", depois: "depois" },
  },
  { texto: "E o Beacon, um painel que ninguém abria, virou o rito.", marcas: { virou: "virou" } },
  "Cada peça da tela guia a reunião.",
  "O quadro mostra em que fase está cada feature.",
  "O fluxo começa no produto.",
  "Dentro dele, a feature, com o problema que ela resolve.",
  {
    texto: "Com a área, definimos alcance, impacto e confiança. A nota diz qual discouveri vem primeiro.",
    marcas: { nota: "A nota" },
  },
  "O discouveri traz o esforço.",
  "E o ráice completo decide o que entra em execução.",
  "No fim, a ata se escreve sozinha.",
  "A área não manda um pedido e espera. Ela prioriza com a gente.",
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
