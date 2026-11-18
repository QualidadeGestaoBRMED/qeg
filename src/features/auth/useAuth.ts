import { useCallback, useEffect, useState } from "react";
import { aoExpirarSessao } from "./sessionEvents";

type AuthStatus = "checking" | "authed" | "anon";

/** areaId nulo = acesso a tudo; com área, a conta só vê o rito daquela área. */
export type Conta = { usuario: string; areaId: number | null };

function lerConta(corpo: unknown): Conta | null {
  const c = (corpo as { conta?: Partial<Conta> } | null)?.conta;
  if (!c || typeof c.usuario !== "string") return null;
  return { usuario: c.usuario, areaId: typeof c.areaId === "number" ? c.areaId : null };
}

export function useAuth() {
  const [status, setStatus] = useState<AuthStatus>("checking");
  const [conta, setConta] = useState<Conta | null>(null);

  useEffect(() => {
    let active = true;
    fetch("/api/session", { credentials: "same-origin" })
      .then(async (r) => {
        const corpo = r.ok ? await r.json().catch(() => null) : null;
        if (!active) return;
        setConta(lerConta(corpo));
        setStatus(r.ok ? "authed" : "anon");
      })
      .catch(() => {
        if (active) setStatus("anon");
      });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => aoExpirarSessao(() => setStatus("anon")), []);

  const login = useCallback(
    async (username: string, password: string): Promise<string | null> => {
      try {
        const r = await fetch("/api/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "same-origin",
          body: JSON.stringify({ username, password }),
        });
        if (r.ok) {
          setConta(lerConta(await r.json().catch(() => null)));
          setStatus("authed");
          return null;
        }
        const data = (await r.json().catch(() => ({}))) as { error?: string };
        return data.error ?? "Não foi possível entrar.";
      } catch {
        return "Falha de conexão com o servidor.";
      }
    },
    [],
  );

  const logout = useCallback(async () => {
    await fetch("/api/logout", { method: "POST", credentials: "same-origin" }).catch(() => {});
    setConta(null);
    setStatus("anon");
  }, []);

  return { status, conta, login, logout };
}
