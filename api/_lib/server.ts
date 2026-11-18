import { createHmac, timingSafeEqual } from "node:crypto";
import type { IncomingMessage, ServerResponse } from "node:http";
import { ritoHandler } from "./rito.js";

const COOKIE_NAME = "qeg_session";
const SESSION_TTL_SEC = 60 * 60 * 12; // 12h
const PIPEFY_API_URL = "https://api.pipefy.com/graphql";

export type Req = IncomingMessage & { body?: unknown };

function env(name: string): string {
  return process.env[name] ?? "";
}

export async function readJsonBody(req: Req): Promise<Record<string, unknown>> {
  // Vercel já entrega o corpo parseado em req.body; Vite/dev entrega via stream.
  if (req.body !== undefined && req.body !== null) {
    if (typeof req.body === "string") {
      try {
        return JSON.parse(req.body || "{}");
      } catch {
        return {};
      }
    }
    if (typeof req.body === "object") return req.body as Record<string, unknown>;
  }
  const chunks: Buffer[] = [];
  for await (const chunk of req) chunks.push(chunk as Buffer);
  const raw = Buffer.concat(chunks).toString("utf8");
  if (!raw) return {};
  try {
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

function parseCookies(req: Req): Record<string, string> {
  const header = req.headers.cookie;
  if (!header) return {};
  const out: Record<string, string> = {};
  for (const part of header.split(";")) {
    const idx = part.indexOf("=");
    if (idx === -1) continue;
    out[part.slice(0, idx).trim()] = decodeURIComponent(part.slice(idx + 1).trim());
  }
  return out;
}

function sign(value: string, secret: string): string {
  return createHmac("sha256", secret).update(value).digest("hex");
}

function safeEqual(a: string, b: string): boolean {
  const ba = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ba.length !== bb.length) return false;
  return timingSafeEqual(ba, bb);
}

/** Conta logada. areaId nulo = acesso a tudo (login principal); com área, só o rito daquela área. */
export type Conta = { usuario: string; areaId: number | null };

type ContaDeArea = { usuario: string; senha: string; areaId: number };

/** Contas extras, restritas a uma área: AUTH_CONTAS='[{"usuario":"suporte","senha":"...","areaId":1}]'. */
function contasDeArea(): ContaDeArea[] {
  try {
    const lista = JSON.parse(env("AUTH_CONTAS") || "[]");
    if (!Array.isArray(lista)) return [];
    return lista.filter(
      (c): c is ContaDeArea =>
        typeof c?.usuario === "string" &&
        /^[\w-]{1,64}$/.test(c.usuario) &&
        typeof c.senha === "string" &&
        c.senha.length > 0 &&
        Number.isInteger(c.areaId) &&
        c.areaId > 0,
    );
  } catch {
    return [];
  }
}

function autenticar(usuario: string, senha: string): Conta | null {
  const principal = env("AUTH_USERNAME");
  const senhaPrincipal = env("AUTH_PASSWORD");
  if (principal && senhaPrincipal && safeEqual(usuario, principal) && safeEqual(senha, senhaPrincipal)) {
    return { usuario: principal, areaId: null };
  }
  for (const c of contasDeArea()) {
    if (safeEqual(usuario, c.usuario) && safeEqual(senha, c.senha)) return { usuario: c.usuario, areaId: c.areaId };
  }
  return null;
}

// Sessão: "<exp>.<assinatura>" para o login principal (formato antigo) e "<exp>:<usuario>.<assinatura>" para contas de área.
function createSession(secret: string, conta: Conta): string {
  const exp = String(Math.floor(Date.now() / 1000) + SESSION_TTL_SEC);
  const payload = conta.areaId === null ? exp : `${exp}:${conta.usuario}`;
  return `${payload}.${sign(payload, secret)}`;
}

function verifySession(token: string | undefined, secret: string): Conta | null {
  if (!token || !secret) return null;
  const dot = token.lastIndexOf(".");
  if (dot === -1) return null;
  const payload = token.slice(0, dot);
  if (!safeEqual(token.slice(dot + 1), sign(payload, secret))) return null;
  const [exp, usuario] = payload.split(":");
  const expNum = Number(exp);
  if (!Number.isFinite(expNum) || expNum <= Math.floor(Date.now() / 1000)) return null;
  if (usuario === undefined) return { usuario: env("AUTH_USERNAME"), areaId: null };
  // A conta precisa continuar em AUTH_CONTAS: tirar de lá derruba a sessão.
  const conta = contasDeArea().find((c) => c.usuario === usuario);
  return conta ? { usuario: conta.usuario, areaId: conta.areaId } : null;
}

export function contaDaSessao(req: Req): Conta | null {
  return verifySession(parseCookies(req)[COOKIE_NAME], env("SESSION_SECRET"));
}

export function isAuthed(req: Req): boolean {
  return contaDaSessao(req) !== null;
}

/** Login principal: as contas de área não usam Pipefy nem a aba Execução. */
function isAdmin(req: Req): boolean {
  return contaDaSessao(req)?.areaId === null;
}

function isHttps(req: Req): boolean {
  return req.headers["x-forwarded-proto"] === "https";
}

function setSessionCookie(res: ServerResponse, value: string, maxAgeSec: number, secure: boolean) {
  const attrs = [
    `${COOKIE_NAME}=${encodeURIComponent(value)}`,
    "HttpOnly",
    "Path=/",
    "SameSite=Lax",
    `Max-Age=${maxAgeSec}`,
  ];
  if (secure) attrs.push("Secure");
  res.setHeader("Set-Cookie", attrs.join("; "));
}

export function json(res: ServerResponse, status: number, body: unknown) {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json");
  res.end(JSON.stringify(body));
}

export async function loginHandler(req: Req, res: ServerResponse) {
  if (req.method !== "POST") return json(res, 405, { error: "Método não permitido." });

  const secret = env("SESSION_SECRET");
  if (!secret || !env("AUTH_USERNAME") || !env("AUTH_PASSWORD")) {
    return json(res, 500, { error: "Servidor sem credenciais configuradas." });
  }

  const body = await readJsonBody(req);
  const conta = autenticar(String(body.username ?? ""), String(body.password ?? ""));
  if (!conta) return json(res, 401, { error: "Usuário ou senha inválidos." });

  setSessionCookie(res, createSession(secret, conta), SESSION_TTL_SEC, isHttps(req));
  return json(res, 200, { ok: true, conta });
}

export async function logoutHandler(req: Req, res: ServerResponse) {
  setSessionCookie(res, "", 0, isHttps(req));
  return json(res, 200, { ok: true });
}

export async function sessionHandler(req: Req, res: ServerResponse) {
  const conta = contaDaSessao(req);
  return json(res, conta ? 200 : 401, { authed: conta !== null, conta });
}

export async function pipefyHandler(req: Req, res: ServerResponse) {
  if (req.method !== "POST") return json(res, 405, { error: "Método não permitido." });
  if (!isAuthed(req)) return json(res, 401, { error: "Não autenticado." });
  if (!isAdmin(req)) return json(res, 403, { error: "Sem acesso." });

  const token = env("PIPEFY_TOKEN");
  if (!token) return json(res, 500, { error: "PIPEFY_TOKEN não configurado no servidor." });

  const body = await readJsonBody(req);
  const query = body.query;
  if (typeof query !== "string" || !query) {
    return json(res, 400, { error: "query GraphQL ausente." });
  }

  try {
    const upstream = await fetch(PIPEFY_API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ query }),
    });
    const text = await upstream.text();
    res.statusCode = upstream.status;
    res.setHeader("Content-Type", "application/json");
    res.end(text);
  } catch {
    json(res, 502, { error: "Falha ao contatar a API do Pipefy." });
  }
}

/** Middleware de dev: espelha as funções serverless no servidor do Vite. */
export function devApiMiddleware() {
  return (req: IncomingMessage, res: ServerResponse, next: (err?: unknown) => void) => {
    const url = (req.url ?? "").split("?")[0];
    if (url === "/api/login") return void loginHandler(req, res);
    if (url === "/api/logout") return void logoutHandler(req, res);
    if (url === "/api/session") return void sessionHandler(req, res);
    if (url === "/api/pipefy") return void pipefyHandler(req, res);
    if (url === "/api/rito") return void ritoHandler(req, res);
    next();
  };
}
