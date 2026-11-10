export function dbConnectionOptions(connectionString) {
  const url = new URL(connectionString);
  const hostname = url.hostname.replace(/^\[|\]$/g, "");
  const isLocal = ["localhost", "127.0.0.1", "::1"].includes(hostname);

  if (isLocal) return { ssl: false };
  if (!hostname.split(".")[0].endsWith("-pooler")) {
    throw new Error("DATABASE_URL remoto precisa usar o hostname pooled do Neon com -pooler.");
  }
  if (url.searchParams.get("sslmode") !== "verify-full") {
    throw new Error("DATABASE_URL remoto precisa incluir sslmode=verify-full.");
  }
  return {};
}
