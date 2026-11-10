import { useEffect, useState } from "react";
import { ESCALA_CONFIANCA, ESCALA_IMPACTO } from "../regras";
import type { CamposItem, Item } from "../tipos";
import { Campo, Escolha, estiloEntrada } from "./ui";

function Numero({
  id,
  valor,
  onSalvar,
  placeholder,
}: {
  id: string;
  valor: number | null;
  onSalvar: (v: number | null) => void;
  placeholder: string;
}) {
  const [texto, setTexto] = useState(valor == null ? "" : String(valor).replace(".", ","));
  useEffect(() => setTexto(valor == null ? "" : String(valor).replace(".", ",")), [valor]);
  const salvar = () => {
    const limpo = texto.trim().replace(",", ".");
    const n = limpo === "" ? null : Number(limpo);
    if (n !== null && (!Number.isFinite(n) || n < 0)) {
      setTexto(valor == null ? "" : String(valor));
      return;
    }
    if (n !== valor) onSalvar(n);
  };
  return (
    <input
      id={id}
      inputMode="decimal"
      value={texto}
      placeholder={placeholder}
      onChange={(e) => setTexto(e.target.value)}
      onBlur={salvar}
      onKeyDown={(e) => e.key === "Enter" && (e.target as HTMLInputElement).blur()}
      className={`${estiloEntrada} max-w-[160px] tabular-nums`}
    />
  );
}

/** R, I e C sempre; E só quando `comEsforco` (depois do discovery). */
export function RiceCampos({
  item,
  onSalvar,
  comEsforco,
}: {
  item: Item;
  onSalvar: (campos: CamposItem) => void;
  comEsforco: boolean;
}) {
  return (
    <div className="flex flex-col gap-4">
      <Campo rotulo="Alcance" dica="Pessoas ou pedidos impactados por mês.">
        <Numero id={`reach-${item.id}`} valor={item.reach} placeholder="ex.: 300" onSalvar={(v) => onSalvar({ reach: v })} />
      </Campo>
      <Campo rotulo="Impacto">
        <Escolha
          rotulo="Impacto"
          valor={item.impact}
          onChange={(v) => onSalvar({ impact: v })}
          opcoes={ESCALA_IMPACTO.map((e) => ({ valor: e.valor, nome: e.nome, dica: e.exemplo }))}
        />
      </Campo>
      <Campo rotulo="Confiança">
        <Escolha
          rotulo="Confiança"
          valor={item.confidence}
          onChange={(v) => onSalvar({ confidence: v })}
          opcoes={ESCALA_CONFIANCA.map((e) => ({ valor: e.valor, nome: e.nome, dica: e.exemplo }))}
        />
      </Campo>
      {comEsforco && (
        <Campo rotulo="Esforço" dica="Pessoa-semana, estimado no discovery.">
          <Numero id={`effort-${item.id}`} valor={item.effort} placeholder="ex.: 2" onSalvar={(v) => onSalvar({ effort: v })} />
        </Campo>
      )}
    </div>
  );
}
