// App raiz: login e, depois, o rito (tela principal) ou a execução (monitor de sprint).
import { useState } from "react";
import { LogOut } from "lucide-react";
import { LoginScreen } from "@/features/auth/LoginScreen";
import { useAuth } from "@/features/auth/useAuth";
import { RitoScreen } from "@/features/rito/RitoScreen";
import { SprintMonitorScreen } from "@/features/sprint-monitor";
import { cn } from "@/lib/utils";

type Tela = "rito" | "execucao";

const App = () => {
  const { status, login, logout } = useAuth();
  const [tela, setTela] = useState<Tela>("rito");

  if (status === "checking") {
    return (
      <main className="flex min-h-screen items-center justify-center bg-background text-sm text-muted-foreground">
        Carregando…
      </main>
    );
  }

  if (status === "anon") {
    return <LoginScreen onLogin={login} />;
  }

  return (
    <div className="min-h-screen bg-background">
      <nav className="border-b border-border bg-white">
        <div className="mx-auto flex w-full max-w-[1400px] items-center justify-between gap-4 px-4 sm:px-8">
          <div className="flex items-center gap-6">
            <span className="py-3 text-sm font-semibold tracking-tight text-foreground">QEG</span>
            <div className="flex gap-1" role="tablist" aria-label="Seções">
              {(
                [
                  ["rito", "Rito"],
                  ["execucao", "Execução"],
                ] as const
              ).map(([chave, nome]) => (
                <button
                  key={chave}
                  type="button"
                  role="tab"
                  aria-selected={tela === chave}
                  onClick={() => setTela(chave)}
                  className={cn(
                    "border-b-2 px-3 py-3 text-sm font-medium transition-colors",
                    tela === chave
                      ? "border-primary text-foreground"
                      : "border-transparent text-muted-foreground hover:text-foreground",
                  )}
                >
                  {nome}
                </button>
              ))}
            </div>
          </div>
          {tela === "rito" && (
            <button
              type="button"
              onClick={logout}
              className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
            >
              <LogOut className="h-3.5 w-3.5" /> Sair
            </button>
          )}
        </div>
      </nav>

      {tela === "rito" ? (
        <main className="mx-auto w-full max-w-[1400px] px-4 py-8 sm:px-8 sm:py-10">
          <RitoScreen />
        </main>
      ) : (
        <SprintMonitorScreen onLogout={logout} />
      )}
    </div>
  );
};

export default App;
