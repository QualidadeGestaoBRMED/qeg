// API do rito: um único endpoint POST /api/rito com { acao, ...dados }.
import type { ServerResponse } from "node:http";
import pg from "pg";
import { dbConnectionOptions } from "./db-connection.mjs";
import {
  bloqueioDaMudanca,
  CONFIANCAS,
  ETAPAS,
  IMPACTOS,
  montarAta,
  PILARES,
  type Etapa,
} from "../../src/features/rito/regras.js";
import { isAuthed, json, readJsonBody, type Req } from "./server.js";

let pool: pg.Pool | null = null;
function db(): pg.Pool {
  const url = process.env.DATABASE_URL;
  if (!url) throw new ErroDeUso(503, "Banco não configurado: defina DATABASE_URL.");
  if (!pool) {
    pool = new pg.Pool({
      connectionString: url,
      ...dbConnectionOptions(url),
      max: 2,
      connectionTimeoutMillis: 5000,
    });
    pool.on("error", (e) => registrarFalha("rito: erro no pool do banco", e));
  }
  return pool;
}

class ErroDeUso extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

function codigoDeErro(e: unknown): string | undefined {
  if (typeof e !== "object" || e === null || !("code" in e)) return undefined;
  const code = e.code;
  return typeof code === "string" && /^[A-Z0-9_-]{1,32}$/i.test(code) ? code : undefined;
}

const CODIGOS_BANCO_INDISPONIVEL = new Set(["ECONNREFUSED", "ETIMEDOUT", "ENOTFOUND", "ECONNRESET", "57P01", "57P03"]);
const TIMEOUT_DE_CONEXAO = "timeout exceeded when trying to connect";

function bancoIndisponivel(e: unknown): boolean {
  const code = codigoDeErro(e);
  if (code !== undefined && (CODIGOS_BANCO_INDISPONIVEL.has(code.toUpperCase()) || code.startsWith("08"))) return true;
  return e instanceof Error && e.message === TIMEOUT_DE_CONEXAO;
}

/** Campos estruturais do erro do pg: identificam onde falhou, sem carregar valores. */
const CAMPOS_ESTRUTURAIS = ["severity", "routine", "constraint", "table", "column", "schema"] as const;

function diagnosticoDeErro(e: unknown) {
  const code = codigoDeErro(e);
  const estruturais: Record<string, string> = {};
  if (typeof e === "object" && e !== null) {
    for (const campo of CAMPOS_ESTRUTURAIS) {
      const valor = (e as Record<string, unknown>)[campo];
      if (typeof valor === "string" && /^[\w$.-]{1,128}$/.test(valor)) estruturais[campo] = valor;
    }
  }
  // O stack começa pela mensagem (que pode ter várias linhas): ela sai, só os frames "at ..." ficam.
  const bruto = e instanceof Error && typeof e.stack === "string" ? e.stack : "";
  const stack = e instanceof Error && e.message ? bruto.replace(e.message, "") : bruto;
  const primeiroFrame = stack.search(/^\s+at /m);
  const frames = primeiroFrame < 0 ? [] : stack.slice(primeiroFrame).split("\n").map((l) => l.trim()).slice(0, 10);
  return {
    name: e instanceof Error ? e.name : "unknown",
    ...(code ? { code } : {}),
    ...estruturais,
    message: "Falha ao processar a ação no banco do Rito.",
    stack: frames,
  };
}

function registrarFalha(contexto: string, e: unknown) {
  console.error(contexto, diagnosticoDeErro(e));
}

type Dados = Record<string, unknown>;

function inteiro(v: unknown, campo: string): number {
  const n = Number(v);
  if (!Number.isInteger(n) || n <= 0) throw new ErroDeUso(400, `Campo "${campo}" inválido.`);
  return n;
}
function opcInteiro(v: unknown, campo: string): number | null {
  return v === null || v === undefined || v === "" ? null : inteiro(v, campo);
}
function texto(v: unknown, max = 2000): string {
  return typeof v === "string" ? v.trim().slice(0, max) : "";
}
function numeroOuNulo(v: unknown, campo: string, permitidos?: readonly number[]): number | null {
  if (v === null || v === undefined || v === "") return null;
  const n = Number(v);
  if (!Number.isFinite(n) || n < 0) throw new ErroDeUso(400, `Campo "${campo}" inválido.`);
  if (permitidos && !permitidos.includes(n)) throw new ErroDeUso(400, `Valor fora da escala em "${campo}".`);
  return n;
}

const COLUNAS_ITEM = `i.id, i.area_id as "areaId", i.produto_id as "produtoId", i.titulo, i.problema,
  i.solicitante, i.pilar, i.etapa, i.reach::float, i.impact::float, i.confidence::float, i.effort::float,
  i.solucao, i.riscos, i.motivo, i.pipefy_url as "pipefyUrl", i.criado_em as "criadoEm",
  i.atualizado_em as "atualizadoEm"`;

// Campos editáveis e como validar cada um.
const EDITAVEIS: Record<string, (v: unknown) => unknown> = {
  titulo: (v) => {
    const t = texto(v, 200);
    if (!t) throw new ErroDeUso(400, "O título não pode ficar vazio.");
    return t;
  },
  problema: (v) => texto(v),
  solicitante: (v) => texto(v, 200),
  pilar: (v) => {
    if (v === null || v === "") return null;
    if (!PILARES.includes(v as never)) throw new ErroDeUso(400, "Pilar inválido.");
    return v;
  },
  produto_id: (v) => opcInteiro(v, "produto"),
  reach: (v) => numeroOuNulo(v, "alcance"),
  impact: (v) => numeroOuNulo(v, "impacto", IMPACTOS),
  confidence: (v) => numeroOuNulo(v, "confiança", CONFIANCAS),
  effort: (v) => {
    const n = numeroOuNulo(v, "esforço");
    if (n === 0) throw new ErroDeUso(400, "O esforço precisa ser maior que zero.");
    return n;
  },
  solucao: (v) => texto(v),
  riscos: (v) => texto(v),
  pipefy_url: (v) => {
    const t = texto(v, 500);
    if (t && !/^https:\/\//.test(t)) throw new ErroDeUso(400, "O link do Pipefy precisa começar com https://");
    return t;
  },
};
const NOMES_CAMPOS: Record<string, string> = { produtoId: "produto_id", pipefyUrl: "pipefy_url" };

async function buscarItem(c: pg.PoolClient | pg.Pool, id: number) {
  const { rows } = await c.query(`select ${COLUNAS_ITEM} from itens i where i.id = $1`, [id]);
  if (!rows[0]) throw new ErroDeUso(404, "Item não encontrado.");
  return rows[0];
}

const acoes: Record<string, (d: Dados) => Promise<unknown>> = {
  /** Áreas com a contagem de itens por etapa (seleção de área e visão geral). */
  async areas() {
    const { rows } = await db().query(`
      select a.id, a.nome,
        coalesce(json_object_agg(i.etapa, i.n) filter (where i.etapa is not null), '{}') as contagem
      from areas a
      left join (select area_id, etapa, count(*)::int n from itens group by 1, 2) i on i.area_id = a.id
      group by a.id order by a.nome`);
    return { areas: rows };
  },

  /** Tudo o que a tela de uma área precisa (ou de todas, sem areaId). */
  async dados(d) {
    const areaId = opcInteiro(d.areaId, "área");
    const p = db();
    const filtro = areaId ? "where i.area_id = $1" : "";
    const args = areaId ? [areaId] : [];
    const [itens, produtos, rito] = await Promise.all([
      p.query(`select ${COLUNAS_ITEM} from itens i ${filtro} order by i.id`, args),
      p.query(
        `select p.id, p.nome, p.descricao, p.status, coalesce(array_agg(pa.area_id) filter (where pa.area_id is not null), '{}') as "areaIds"
         from produtos p left join produto_areas pa on pa.produto_id = p.id
         ${areaId ? "where p.id in (select produto_id from produto_areas where area_id = $1)" : ""}
         group by p.id order by p.nome`,
        args,
      ),
      p.query(
        `select id, area_id as "areaId", iniciado_em as "iniciadoEm" from ritos
         where encerrado_em is null and area_id ${areaId ? "= $1" : "is null"} order by id desc limit 1`,
        args,
      ),
    ]);
    return { itens: itens.rows, produtos: produtos.rows, ritoAberto: rito.rows[0] ?? null };
  },

  async criarItem(d) {
    const areaId = inteiro(d.areaId, "área");
    const valores: Record<string, unknown> = {};
    for (const [campo, validar] of Object.entries(EDITAVEIS)) {
      const chave = Object.keys(NOMES_CAMPOS).find((k) => NOMES_CAMPOS[k] === campo) ?? campo;
      if (d[chave] !== undefined) valores[campo] = validar(d[chave]);
    }
    if (!valores.titulo) throw new ErroDeUso(400, "Dê um título à feature.");
    if (!valores.produto_id) throw new ErroDeUso(400, "Escolha o produto da feature.");
    const cols = Object.keys(valores);
    const c = await db().connect();
    try {
      await c.query("begin");
      const { rows } = await c.query(
        `insert into itens (area_id, ${cols.join(", ")}) values ($1, ${cols.map((_, i) => `$${i + 2}`).join(", ")}) returning id`,
        [areaId, ...cols.map((k) => valores[k])],
      );
      await c.query(`insert into movimentos (item_id, rito_id, de, para, nota) values ($1, $2, null, 'backlog', 'Entrou no backlog')`, [
        rows[0].id,
        opcInteiro(d.ritoId, "rito"),
      ]);
      await c.query("commit");
      return { item: await buscarItem(c, rows[0].id) };
    } catch (e) {
      await c.query("rollback");
      throw e;
    } finally {
      c.release();
    }
  },

  async atualizarItem(d) {
    const id = inteiro(d.id, "id");
    const campos = (d.campos ?? {}) as Dados;
    const sets: string[] = [];
    const args: unknown[] = [];
    for (const [chave, valor] of Object.entries(campos)) {
      const coluna = NOMES_CAMPOS[chave] ?? chave;
      const validar = EDITAVEIS[coluna];
      if (!validar) throw new ErroDeUso(400, `Campo "${chave}" não pode ser editado.`);
      args.push(validar(valor));
      sets.push(`${coluna} = $${args.length}`);
    }
    if (sets.length === 0) return { item: await buscarItem(db(), id) };
    const c = await db().connect();
    try {
      await c.query("begin");
      const { rows } = await c.query(`select ${COLUNAS_ITEM} from itens i where i.id = $1 for update`, [id]);
      const item = rows[0];
      if (!item) throw new ErroDeUso(404, "Item não encontrado.");
      if (item.etapa !== "backlog") for (const campo of ["reach", "impact", "confidence", "effort"]) {
        if (Object.hasOwn(campos, campo) && (campos[campo] == null || campos[campo] === "")) throw new ErroDeUso(409, `Não é possível limpar ${campo} após avançar a etapa.`);
      }
      args.push(id);
      const r = await c.query(`update itens set ${sets.join(", ")}, atualizado_em = now() where id = $${args.length}`, args);
      if (r.rowCount === 0) throw new ErroDeUso(404, "Item não encontrado.");
      await c.query("commit");
      return { item: await buscarItem(c, id) };
    } catch (e) {
      await c.query("rollback");
      throw e;
    } finally {
      c.release();
    }
  },

  /** Muda a etapa respeitando as regras do rito e registra o movimento. */
  async mover(d) {
    const id = inteiro(d.id, "id");
    const para = d.para as Etapa;
    if (!ETAPAS.includes(para)) throw new ErroDeUso(400, "Etapa inválida.");
    const nota = texto(d.nota, 500);
    const c = await db().connect();
    try {
      await c.query("begin");
      const { rows } = await c.query(`select ${COLUNAS_ITEM} from itens i where i.id = $1 for update`, [id]);
      const item = rows[0];
      if (!item) throw new ErroDeUso(404, "Item não encontrado.");
      const bloqueio = bloqueioDaMudanca(item, para, nota);
      if (bloqueio) throw new ErroDeUso(409, bloqueio);
      await c.query(
        `update itens set etapa = $1, motivo = case when $1 = 'descartado' then $2 else motivo end, atualizado_em = now() where id = $3`,
        [para, nota, id],
      );
      await c.query(`insert into movimentos (item_id, rito_id, de, para, nota) values ($1, $2, $3, $4, $5)`, [
        id,
        opcInteiro(d.ritoId, "rito"),
        item.etapa,
        para,
        nota,
      ]);
      await c.query("commit");
      return { item: await buscarItem(c, id) };
    } catch (e) {
      await c.query("rollback");
      throw e;
    } finally {
      c.release();
    }
  },

  async historico(d) {
    const id = inteiro(d.id, "id");
    const { rows } = await db().query(
      `select id, de, para, nota, rito_id as "ritoId", criado_em as "criadoEm" from movimentos where item_id = $1 order by criado_em desc, id desc`,
      [id],
    );
    return { movimentos: rows };
  },

  async criarProduto(d) {
    const areaId = inteiro(d.areaId, "área");
    const nome = texto(d.nome, 200);
    if (!nome) throw new ErroDeUso(400, "Dê um nome ao produto.");
    const c = await db().connect();
    try {
      await c.query("begin");
      const { rows } = await c.query(
        `insert into produtos (nome, descricao, status) values ($1, $2, 'em_construcao')
         on conflict (nome) do update set nome = excluded.nome returning id`,
        [nome, texto(d.descricao)],
      );
      await c.query(`insert into produto_areas values ($1, $2) on conflict do nothing`, [rows[0].id, areaId]);
      await c.query("commit");
      return { id: rows[0].id };
    } catch (e) {
      await c.query("rollback");
      throw e;
    } finally {
      c.release();
    }
  },

  async iniciarRito(d) {
    const areaId = opcInteiro(d.areaId, "área");
    const p = db();
    const aberto = await p.query(
      `select id, area_id as "areaId", iniciado_em as "iniciadoEm" from ritos where encerrado_em is null and area_id ${areaId ? "= $1" : "is null"} limit 1`,
      areaId ? [areaId] : [],
    );
    if (aberto.rows[0]) return { rito: aberto.rows[0] };
    const { rows } = await p.query(
      `insert into ritos (area_id) values ($1) returning id, area_id as "areaId", iniciado_em as "iniciadoEm"`,
      [areaId],
    );
    return { rito: rows[0] };
  },

  /** Fecha o rito e grava a ata montada a partir dos movimentos feitos nele. */
  async encerrarRito(d) {
    const id = inteiro(d.id, "rito");
    const p = db();
    const { rows: r } = await p.query(
      `select r.id, r.iniciado_em, coalesce(a.nome, 'Todas as áreas') as area from ritos r left join areas a on a.id = r.area_id where r.id = $1`,
      [id],
    );
    if (!r[0]) throw new ErroDeUso(404, "Rito não encontrado.");
    const { rows: movs } = await p.query(
      `select i.titulo, m.de, m.para, m.nota from movimentos m join itens i on i.id = m.item_id where m.rito_id = $1 order by m.id`,
      [id],
    );
    const ata = montarAta(r[0].area, new Date(r[0].iniciado_em), movs);
    await p.query(`update ritos set encerrado_em = coalesce(encerrado_em, now()), ata = $1 where id = $2`, [ata, id]);
    return { ata };
  },

  async ritos(d) {
    const areaId = opcInteiro(d.areaId, "área");
    const { rows } = await db().query(
      `select id, iniciado_em as "iniciadoEm", encerrado_em as "encerradoEm", ata from ritos
       where encerrado_em is not null and area_id ${areaId ? "= $1" : "is null"} order by id desc limit 20`,
      areaId ? [areaId] : [],
    );
    return { ritos: rows };
  },
};

export async function ritoHandler(req: Req, res: ServerResponse) {
  if (req.method !== "POST") return json(res, 405, { error: "Método não permitido." });
  if (!isAuthed(req)) return json(res, 401, { error: "Não autenticado." });
  const d = await readJsonBody(req);
  const acao = acoes[String(d.acao ?? "")];
  if (!acao) return json(res, 400, { error: "Ação desconhecida." });
  try {
    return json(res, 200, await acao(d));
  } catch (e) {
    if (e instanceof ErroDeUso) return json(res, e.status, { error: e.message });
    registrarFalha("rito: falha ao processar a ação", e);
    if (bancoIndisponivel(e)) {
      return json(res, 503, { error: "Banco do Rito temporariamente indisponível. Tente novamente em instantes." });
    }
    return json(res, 500, { error: "Erro interno no Rito" });
  }
}
