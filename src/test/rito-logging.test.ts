import { describe, expect, it } from "vitest";
import { formatRitoActionLog } from "../../api/_lib/rito.js";

describe("formatRitoActionLog", () => {
  it("emite somente ação, área, resultado e duração", () => {
    const line = formatRitoActionLog("criarItem", 17, "ok", 12.4);
    const parsed = JSON.parse(line);

    expect(parsed).toEqual({ action: "criarItem", area: 17, result: "ok", duration_ms: 12 });
    expect(Object.keys(parsed).sort()).toEqual(["action", "area", "duration_ms", "result"]);
    expect(line).not.toMatch(/email|token|body|password|text/i);
  });

  it("normaliza valores de log e não repassa texto livre", () => {
    const line = formatRitoActionLog("person@example.com", "token=secret", "error", Number.NaN);

    expect(JSON.parse(line)).toEqual({ action: "unknown", area: null, result: "error", duration_ms: 0 });
    expect(line).not.toContain("person@example.com");
    expect(line).not.toContain("secret");
  });
});
