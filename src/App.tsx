import { LoginScreen } from "@/features/auth/LoginScreen";
import { useAuth } from "@/features/auth/useAuth";
import { SprintMonitorScreen } from "@/features/sprint-monitor";

const App = () => {
  const { status, login, logout } = useAuth();

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

  return <SprintMonitorScreen onLogout={logout} />;
};

export default App;
