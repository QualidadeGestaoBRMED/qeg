import { useEffect, useState } from "react";
import { X } from "lucide-react";
import type { CamposItem, Produto } from "../tipos";
import { Aviso, Botao, Campo, estiloEntrada } from "./ui";

const NOVO = "__novo";

/** Passo 1 e 2 do fluxo: escolher (ou criar) o produto e adicionar a feature nele. */
export function NovaFeature({
  produtos,
  produtoInicial,
  onCriarProduto,
  onCriar,
  onFechar,
}: {
  produtos: Produto[];
  produtoInicial?: number | null;
  onCriarProduto: (nome: string) => Promise<number | null>;
  onCriar: (campos: CamposItem) => Promise<string | null>;
  onFechar: () => void;
}) {
  const [produto, setProduto] = useState<string>(produtoInicial ? String(produtoInicial) : produtos.length ? "" : NOVO);
  const [nomeProduto, setNomeProduto] = useState("");
  const [titulo, setTitulo] = useState("");
  const [problema, setProblema] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);

  useEffect(() => {
    const esc = (e: KeyboardEvent) => e.key === "Escape" && onFechar();
    window.addEventListener("keydown", esc);
    return () => window.removeEventListener("keydown", esc);
  }, [onFechar]);

  const salvar = async () => {
    if (!titulo.trim()) return setErro("Dê um título à feature.");
    if (!produto || (produto === NOVO && !nomeProduto.trim())) return setErro("Escolha ou crie o produto da feature.");
    setSalvando(true);
    let produtoId = Number(produto);
    if (produto === NOVO) {
      const id = await onCriarProduto(nomeProduto.trim());
      if (!id) {
        setSalvando(false);
        return setErro("Não consegui criar o produto.");
      }
      produtoId = id;
    }
    const e = await onCriar({ titulo: titulo.trim(), problema: problema.trim(), produtoId });
    setSalvando(false);
    if (e) setErro(e);
    else onFechar();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-foreground/25 px-4 py-16" onClick={onFechar}>
      <div
        role="dialog"
        aria-label="Nova feature"
        onClick={(e) => e.stopPropagation()}
        className="flex w-full max-w-[560px] flex-col gap-5 rounded-xl bg-background p-6 shadow-xl"
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-primary">Produto → feature</p>
            <h2 className="text-xl font-semibold text-foreground">Nova feature</h2>
          </div>
          <Botao variante="fantasma" aria-label="Fechar" onClick={onFechar} className="px-2">
            <X className="h-4 w-4" />
          </Botao>
        </div>
        {erro && <Aviso texto={erro} onFechar={() => setErro(null)} />}
        <Campo rotulo="1. Produto">
          <select id="nf-produto" aria-label="Produto" value={produto} onChange={(e) => setProduto(e.target.value)} className={estiloEntrada}>
            <option value="" disabled>
              Escolha o produto
            </option>
            {produtos.map((p) => (
              <option key={p.id} value={p.id}>
                {p.nome}
              </option>
            ))}
            <option value={NOVO}>+ Novo produto</option>
          </select>
          {produto === NOVO && (
            <input
              id="nf-novo-produto"
              autoFocus
              aria-label="Nome do novo produto"
              value={nomeProduto}
              onChange={(e) => setNomeProduto(e.target.value)}
              placeholder="Nome do produto"
              className={estiloEntrada}
            />
          )}
        </Campo>
        <Campo rotulo="2. Feature">
          <input
            id="nf-titulo"
            autoFocus={produto !== NOVO}
            aria-label="Título da feature"
            value={titulo}
            onChange={(e) => setTitulo(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && void salvar()}
            placeholder="O que a área precisa?"
            className={estiloEntrada}
          />
          <textarea
            id="nf-problema"
            aria-label="Problema"
            rows={2}
            value={problema}
            onChange={(e) => setProblema(e.target.value)}
            placeholder="Qual problema isso resolve? (opcional)"
            className={`${estiloEntrada} resize-y`}
          />
        </Campo>
        <p className="text-xs text-muted-foreground">
          Depois de criada, a feature vai para <b>Features novas</b>. O próximo passo é preencher a ficha de priorização.
        </p>
        <div className="flex justify-end gap-2">
          <Botao variante="fantasma" onClick={onFechar}>
            Cancelar
          </Botao>
          <Botao variante="primario" disabled={salvando} onClick={() => void salvar()}>
            Adicionar feature
          </Botao>
        </div>
      </div>
    </div>
  );
}
