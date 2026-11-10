import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { devApiMiddleware } from "./api/_lib/server";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  // Expõe as vars de servidor ao middleware de dev — NÃO ao bundle do cliente
  // (o Vite só injeta no client as variáveis com prefixo VITE_).
  for (const key of ["PIPEFY_TOKEN", "AUTH_USERNAME", "AUTH_PASSWORD", "SESSION_SECRET", "DATABASE_URL"]) {
    if (env[key] && !process.env[key]) process.env[key] = env[key];
  }

  return {
    server: {
      host: "::",
      port: 8080,
    },
    plugins: [
      react(),
      {
        name: "qeg-dev-api",
        configureServer(server) {
          server.middlewares.use(devApiMiddleware());
        },
      },
    ],
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
    },
  };
});
