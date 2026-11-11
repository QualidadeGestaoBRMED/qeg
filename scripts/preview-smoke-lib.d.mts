export const COLD_START_LIMIT_MS: number;
export type Status = "ok" | "aviso" | "falha" | "pulado";
export type Passo = { nome: string; status: Status; detalhe?: string; ms?: number };
export function parseArgs(
  argv: string[],
  env: Record<string, string | undefined>,
): { baseUrl: string; username: string; password: string; allowProduction: boolean; erros: string[]; bloqueio: string | null };
export function bloqueioDeProducao(baseUrl: string, env: Record<string, string | undefined>): string | null;
export const PREVIEW_PROTEGIDO: string;
export function classificarPrimeiraChamada(resposta: { status: number; contentType?: string | null; corpo?: { error?: unknown } | null }): { ok: true } | { ok: false; mensagem: string };
export function redact(texto: unknown, segredos: string[]): string;
export function formatReport(passos: Passo[], opcoes: { baseUrl: string }): string;
export function coldStartStatus(ms: number): { status: "ok" | "aviso"; detalhe: string };
export function runSteps(
  definicoes: { nome: string; executar: () => Promise<{ status?: Status; detalhe?: string } | void> }[],
  segredos?: string[],
): Promise<Passo[]>;
