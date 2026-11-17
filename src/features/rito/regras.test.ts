import { describe, expect, it } from "vitest";
import { bloqueioDaMudanca, chaveParaMover, faixaDeValor, faseDoItem, ganhoDaFicha, montarAta, ordenar, preScore, rice, scoreDoCard, statusDoProduto, type FichaGanho, type ItemRice } from "./regras";

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
  it("discovery exige a ficha completa, com o business case", () => {
    expect(bloqueioDaMudanca(base, "discovery")).toMatch(/ficha/);
    expect(bloqueioDaMudanca({ ...base, reach: 1, impact: 1, confidence: 1 }, "discovery")).toMatch(/vale a pena/);
    expect(bloqueioDaMudanca({ ...base, reach: 1, impact: 1, confidence: 1, justificativa: "Evita perder o cliente." }, "discovery")).toBeNull();
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

describe("fases do fluxo", () => {
  it("o backlog se divide pela ficha completa", () => {
    expect(faseDoItem(base)).toBe("nova");
    expect(faseDoItem({ ...base, reach: 1, impact: 1, confidence: 1 })).toBe("nova");
    expect(faseDoItem({ ...base, reach: 1, impact: 1, confidence: 1, justificativa: "x" })).toBe("priorizar_discovery");
    expect(faseDoItem({ ...base, etapa: "decidir" })).toBe("priorizar_execucao");
    expect(faseDoItem({ ...base, etapa: "entregue" })).toBeNull();
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
      { itemId: 1, titulo: "Convocação EDF", de: "decidir", para: "execucao", nota: "aprovado" },
      { itemId: 2, titulo: "Item novo", de: null, para: "backlog", nota: "Entrou no backlog" },
      { itemId: 3, titulo: "BI antigo", de: "decidir", para: "backlog", nota: "" },
    ]);
    expect(ata).toContain("Rito de priorização — Suporte — 04/11/2026");
    expect(ata).toContain("Entraram em execução:\n- Convocação EDF (aprovado)");
    expect(ata).toContain("Features novas:\n- Item novo");
    expect(ata).toContain("Voltaram para o backlog:\n- BI antigo");
  });

  it("mostra cada item uma vez, no estado final: execução, pausa, retomada e entrega só em Entregues", () => {
    const ata = montarAta("Suporte", new Date("2026-11-04T15:00:00Z"), [
      { itemId: 7, titulo: "Painel X", de: "decidir", para: "execucao", nota: "aprovado" },
      { itemId: 7, titulo: "Painel X", de: "execucao", para: "pausado", nota: "aguardando cliente" },
      { itemId: 7, titulo: "Painel X", de: "pausado", para: "execucao", nota: "" },
      { itemId: 7, titulo: "Painel X", de: "execucao", para: "entregue", nota: "" },
    ]);
    expect(ata).toContain("Entregues:\n- Painel X");
    expect(ata.match(/Painel X/g)).toHaveLength(1);
    expect(ata).not.toContain("Entraram em execução");
    expect(ata).not.toContain("Pausados");
  });

  it("execução seguida de pausa aparece só em Pausados, com a nota da pausa", () => {
    const ata = montarAta("Suporte", new Date("2026-11-04T15:00:00Z"), [
      { itemId: 8, titulo: "Painel Y", de: "decidir", para: "execucao", nota: "" },
      { itemId: 8, titulo: "Painel Y", de: "execucao", para: "pausado", nota: "aguardando cliente" },
    ]);
    expect(ata).toContain("Pausados:\n- Painel Y (aguardando cliente)");
    expect(ata.match(/Painel Y/g)).toHaveLength(1);
    expect(ata).not.toContain("Entraram em execução");
  });

  it("itens diferentes com o mesmo título continuam separados", () => {
    const ata = montarAta("Suporte", new Date("2026-11-04T15:00:00Z"), [
      { itemId: 1, titulo: "Igual", de: "decidir", para: "execucao", nota: "" },
      { itemId: 2, titulo: "Igual", de: "decidir", para: "execucao", nota: "" },
    ]);
    expect(ata.match(/- Igual/g)).toHaveLength(2);
  });
});

describe("status do produto", () => {
  const em = (etapa: ItemRice["etapa"]): ItemRice => ({ ...base, etapa });

  it("acompanha as features do quadro", () => {
    expect(statusDoProduto("entregue", [em("backlog"), em("execucao")])).toBe("em_construcao");
    expect(statusDoProduto("entregue", [em("discovery")])).toBe("em_avaliacao");
    expect(statusDoProduto("parado", [em("decidir")])).toBe("em_avaliacao");
  });

  it("sem feature aberta, vale o status gravado; em construção sem execução vira em avaliação", () => {
    expect(statusDoProduto("entregue", [em("entregue"), em("descartado")])).toBe("entregue");
    expect(statusDoProduto("parado", [em("pausado")])).toBe("parado");
    expect(statusDoProduto("em_implantacao", [])).toBe("em_implantacao");
    expect(statusDoProduto("em_construcao", [])).toBe("em_avaliacao");
  });
});

describe("ficha guiada", () => {
  const ficha: FichaGanho = { ganhoTipo: null, horasMes: null, valorHora: null, clientes: [], riscoPerda: null, faixaReceita: null, nivelRisco: null };
  const cli = (...tiers: ("bronze" | "prata" | "ouro" | "diamante" | null)[]) => tiers.map((tier, i) => ({ nome: `C${i}`, tier }));

  it("faixas de valor anual alinhadas aos tiers", () => {
    expect([30_000, 50_000, 50_001, 200_000, 350_000, 500_001].map(faixaDeValor)).toEqual([1, 1, 2, 2, 3, 4]);
  });

  it("economia de tempo vira R$ por ano e depois faixa", () => {
    expect(ganhoDaFicha({ ...ficha, ganhoTipo: "tempo", horasMes: 60, valorHora: 40 })).toEqual({ nota: 1, texto: expect.stringContaining("28.800") });
    expect(ganhoDaFicha({ ...ficha, ganhoTipo: "tempo", horasMes: 400, valorHora: 50 })?.nota).toBe(3);
    expect(ganhoDaFicha({ ...ficha, ganhoTipo: "tempo", horasMes: 60, valorHora: null })).toBeNull();
  });

  it("cliente: tier, uma faixa acima com risco de perda", () => {
    expect(ganhoDaFicha({ ...ficha, ganhoTipo: "cliente", clientes: cli("ouro"), riscoPerda: false })?.nota).toBe(3);
    expect(ganhoDaFicha({ ...ficha, ganhoTipo: "cliente", clientes: cli("ouro"), riscoPerda: true })?.nota).toBe(4);
    expect(ganhoDaFicha({ ...ficha, ganhoTipo: "cliente", clientes: cli("diamante"), riscoPerda: true })?.nota).toBe(5);
    expect(ganhoDaFicha({ ...ficha, ganhoTipo: "cliente", clientes: cli("ouro"), riscoPerda: null })).toBeNull();
  });

  it("vários clientes: vale o maior tier; todos precisam de tier", () => {
    expect(ganhoDaFicha({ ...ficha, ganhoTipo: "cliente", clientes: cli("prata", "ouro", "bronze"), riscoPerda: false })).toEqual({ nota: 3, texto: "Ouro (maior de 3 clientes)" });
    expect(ganhoDaFicha({ ...ficha, ganhoTipo: "cliente", clientes: cli("prata", null), riscoPerda: false })).toBeNull();
    expect(ganhoDaFicha({ ...ficha, ganhoTipo: "cliente", clientes: [], riscoPerda: false })).toBeNull();
  });

  it("risco ou controle: o nível escolhido", () => {
    expect(ganhoDaFicha({ ...ficha, ganhoTipo: "risco", nivelRisco: 3 })).toEqual({ nota: 3, texto: "Multa ou reclamação" });
    expect(ganhoDaFicha({ ...ficha, ganhoTipo: "risco" })).toBeNull();
  });

  it("receita: a faixa escolhida", () => {
    expect(ganhoDaFicha({ ...ficha, ganhoTipo: "receita", faixaReceita: 2 })?.nota).toBe(2);
    expect(ganhoDaFicha(ficha)).toBeNull();
  });
});

describe("ajuste manual da posição", () => {
  const itens = [
    { ...base, id: 1, reach: 3, impact: 4, confidence: 1 }, // 12
    { ...base, id: 2, reach: 3, impact: 2, confidence: 1 }, // 6
    { ...base, id: 3, reach: 1, impact: 2, confidence: 1 }, // 2
  ];

  it("subir põe o item entre os vizinhos do novo lugar", () => {
    const chave = chaveParaMover(ordenar(itens), 3, -1)!;
    expect(chave).toBe(9);
    expect(ordenar(itens.map((i) => (i.id === 3 ? { ...i, ajusteScore: chave } : i))).map((i) => i.id)).toEqual([1, 3, 2]);
  });

  it("subir o segundo o põe acima do primeiro; não há para onde subir o primeiro", () => {
    expect(chaveParaMover(ordenar(itens), 2, -1)).toBe(13);
    expect(chaveParaMover(ordenar(itens), 1, -1)).toBeNull();
    expect(chaveParaMover(ordenar(itens), 3, 1)).toBeNull();
  });
});
