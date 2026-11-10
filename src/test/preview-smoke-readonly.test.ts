import { createServer } from "node:http";
import { spawn } from "node:child_process";
import { once } from "node:events";
import { describe, expect, it } from "vitest";

describe("smoke de preview", () => {
  it("faz apenas login, sessão e leitura de areas", async () => {
    const chamadas: string[] = [];
    const server = createServer(async (req, res) => {
      let body = "";
      for await (const chunk of req) body += chunk;
      const acao = body ? JSON.parse(body).acao : undefined;
      chamadas.push(`${req.method} ${req.url}${acao ? ` ${acao}` : ""}`);
      res.setHeader("Content-Type", "application/json");
      if (req.url === "/api/login") res.setHeader("Set-Cookie", "session=fake; Path=/");
      if (req.url === "/api/rito" && !req.headers.cookie) {
        res.statusCode = 401;
        res.end(JSON.stringify({ error: "Não autenticado" }));
      } else if (req.url === "/api/rito") res.end(JSON.stringify({ areas: [] }));
      else if (req.url === "/api/session") res.end(JSON.stringify({ authed: true }));
      else res.end("{}");
    });
    server.listen(0, "127.0.0.1");
    await once(server, "listening");
    try {
      const address = server.address();
      if (!address || typeof address === "string") throw new Error("servidor indisponível");
      const child = spawn(process.execPath, ["scripts/preview-smoke.mjs"], {
        env: { ...process.env, BASE_URL: `http://127.0.0.1:${address.port}`, SMOKE_USERNAME: "tester", SMOKE_PASSWORD: "secret", VERCEL_ENV: "preview", SMOKE_BLOCKED_HOSTS: "" },
        stdio: "pipe",
      });
      let output = "";
      child.stdout.on("data", (data) => { output += data; });
      const [code] = await once(child, "close");
      expect(code).toBe(0);
      expect(output).toContain("somente leitura");
      expect(output).not.toContain("secret");
      expect(chamadas).toEqual(["POST /api/rito areas", "POST /api/login", "GET /api/session", "POST /api/rito areas"]);
    } finally {
      server.close();
    }
  });
});
