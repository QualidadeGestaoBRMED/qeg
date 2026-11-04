import { describe, expect, it } from "vitest";
import { bloqueioDaMudanca, montarAta, ordenar, preScore, rice, scoreDoCard, type ItemRice } from "./regras";

const base: ItemRice = { etapa: "backlog", reach: null, impact: null, confidence: null, effort: null };

describe("scores", () => {
  it("pré-score só existe com R, I e C", () => {
    expect(preScore(base)).toBeNull();
    expect(preScore({ reach: 300, impact: 2, confidence: 0.8 })).toBe(480);
  });

  it("RICE divide pelo esforço e exige esforço positivo", () => {
    expect(rice({ reach: 300, impact: 2, confidence: 0.8, effort: 2 })).toBe(240);
    expect(rice({ reach: 300, impact: 2, confidence: 0.8, effort: null })).toBeNull();
  });

  it("o card mostra RICE quando tem esforço, senão o pré-score", () => {
    expect(scoreDoCard({ ...base, reach: 10, impact: 1, confidence: 1 })).toEqual({ valor: 10, tipo: "pre" });
    expect(scoreDoCard({ ...base, reach: 10, impact: 1, confidence: 1, effort: 2 })).toEqual({ valor: 5, tipo: "rice" });
  });
});

describe("regras de mudança de etapa", () => {
  it("discovery exige R, I e C", () => {
    expect(bloqueioDaMudanca(base, "discovery")).toMatch(/alcance/);
    expect(bloqueioDaMudanca({ ...base, reach: 1, impact: 1, confidence: 1 }, "discovery")).toBeNull();
  });

  it("sair do discovery exige esforço", () => {
    const d: ItemRice = { ...base, etapa: "discovery", reach: 1, impact: 1, confidence: 1 };
    expect(bloqueioDaMudanca(d, "decidir")).toMatch(/esforço/);
    expect(bloqueioDaMudanca({ ...d, effort: 2 }, "decidir")).toBeNull();
  });

  it("descartar exige motivo", () => {
    expect(bloqueioDaMudanca(base, "descartado")).toMatch(/por que/);
    expect(bloqueioDaMudanca(base, "descartado", "cliente saiu")).toBeNull();
  });

  it("não pula etapas", () => {
    expect(bloqueioDaMudanca(base, "execucao")).toMatch(/Não dá/);
  });
});

describe("ordem e ata", () => {
  it("ordena por score, sem nota por último", () => {
    const itens = [
      { ...base, id: 1 },
      { ...base, id: 2, reach: 10, impact: 1, confidence: 1 },
      { ...base, id: 3, reach: 50, impact: 1, confidence: 1 },
    ];
    expect(ordenar(itens).map((i) => i.id)).toEqual([3, 2, 1]);
  });

  it("a ata agrupa por decisão e separa o que é novo do que voltou", () => {
    const ata = montarAta("Suporte", new Date("2026-11-04T15:00:00Z"), [
      { titulo: "Convocação EDF", de: "decidir", para: "execucao", nota: "aprovado" },
      { titulo: "Item novo", de: null, para: "backlog", nota: "Entrou no backlog" },
      { titulo: "BI antigo", de: "decidir", para: "backlog", nota: "" },
    ]);
    expect(ata).toContain("Rito de priorização — Suporte — 04/11/2026");
    expect(ata).toContain("Entraram em execução:\n- Convocação EDF (aprovado)");
    expect(ata).toContain("Entraram no backlog:\n- Item novo");
    expect(ata).toContain("Voltaram para o backlog:\n- BI antigo");
  });
});
