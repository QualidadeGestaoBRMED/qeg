import { useCallback, useEffect, useState } from "react";

type AuthStatus = "checking" | "authed" | "anon";

export function useAuth() {
  const [status, setStatus] = useState<AuthStatus>("checking");

  useEffect(() => {
    let active = true;
    fetch("/api/session", { credentials: "same-origin" })
      .then((r) => {
        if (active) setStatus(r.ok ? "authed" : "anon");
      })
      .catch(() => {
        if (active) setStatus("anon");
      });
    return () => {
      active = false;
    };
  }, []);

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
    setStatus("anon");
  }, []);

  return { status, login, logout };
}
