import { useCallback, useEffect, useState } from "react";
import { ArrowLeftRight, Play, Plus } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ritoApi } from "./api";
import { ItemPainel } from "./componentes/ItemPainel";
import { ModoRito } from "./componentes/ModoRito";
import { NovaFeature } from "./componentes/NovaFeature";
import { Atas, EscolhaArea, ListaProdutos, VisaoGeral } from "./componentes/Paineis";
import { Quadro } from "./componentes/Quadro";
import { Aviso, Botao } from "./componentes/ui";
import type { Area } from "./tipos";
import { useRito } from "./useRito";

const CHAVE_AREA = "rito:area";
type Selecao = number | null | undefined; // undefined = ainda não escolheu; null = todas as áreas

function lerArea(): Selecao {
  try {
    const v = localStorage.getItem(CHAVE_AREA);
    if (v === null) return undefined;
    return v === "todas" ? null : Number(v) || undefined;
  } catch {
    return undefined;
  }
}

export function RitoScreen() {
  const [areas, setAreas] = useState<Area[]>([]);
  const [erroAreas, setErroAreas] = useState<string | null>(null);
  const [selecao, setSelecao] = useState<Selecao>(lerArea);
  const [aberto, setAberto] = useState<number | null>(null);
  const [emRito, setEmRito] = useState(false);
  const [aba, setAba] = useState("quadro");
  const [novaFeature, setNovaFeature] = useState<{ produtoId: number | null } | null>(null);
  const estado = useRito(selecao ?? null);

  const carregarAreas = useCallback(() => {
    ritoApi
      .areas()
      .then((r) => {
        setAreas(r.areas);
        setErroAreas(null);
      })
      .catch((e) => setErroAreas((e as Error).message));
  }, []);
  useEffect(carregarAreas, [carregarAreas]);

  const escolher = (s: Selecao) => {
    setSelecao(s);
    setAba(s === null ? "geral" : "quadro");
    try {
      if (s === undefined) localStorage.removeItem(CHAVE_AREA);
      else localStorage.setItem(CHAVE_AREA, s === null ? "todas" : String(s));
    } catch {
      /* preferência só local */
    }
  };

  const area = areas.find((a) => a.id === selecao);
  const nomeArea = selecao === null ? "Todas as áreas" : area?.nome ?? "";
  const itemAberto = estado.itens.find((i) => i.id === aberto) ?? null;

  const iniciar = async () => {
    if (await estado.iniciarRito()) setEmRito(true);
  };
  const sairDoRito = () => {
    setEmRito(false);
    carregarAreas();
  };

  if (selecao === undefined) {
    return (
      <div className="flex flex-col gap-6">
        {erroAreas && <Aviso texto={erroAreas} />}
        <EscolhaArea areas={areas} onEscolher={escolher} />
      </div>
    );
  }

  const criarFeature = (campos: Parameters<typeof estado.criar>[0]) => estado.criar({ ...campos, solicitante: nomeArea });

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-1">
          <p className="text-xs font-medium uppercase tracking-wide text-primary">
            {selecao === null ? "Reunião interna" : "Rito com a área"}
          </p>
          <h2 className="text-2xl font-semibold tracking-tight text-foreground">{nomeArea}</h2>
        </div>
        <div className="flex flex-wrap gap-2">
          <Botao onClick={() => escolher(undefined)}>
            <ArrowLeftRight className="h-3.5 w-3.5" /> Trocar área
          </Botao>
          {selecao !== null && (
            <Botao onClick={() => setNovaFeature({ produtoId: null })}>
              <Plus className="h-3.5 w-3.5" /> Feature
            </Botao>
          )}
          {selecao !== null && (
            <Botao variante="primario" onClick={() => void iniciar()}>
              <Play className="h-3.5 w-3.5" /> {estado.rito ? "Continuar rito" : "Iniciar rito"}
            </Botao>
          )}
        </div>
      </header>

      {estado.erro && estado.itens.length > 0 && <Aviso texto={estado.erro} onFechar={estado.limparErro} />}

      {estado.carregando && estado.itens.length === 0 ? (
        <p className="text-sm text-muted-foreground">Carregando…</p>
      ) : estado.erro && estado.itens.length === 0 ? (
        <div className="flex flex-col items-start gap-3 rounded-md border border-destructive/40 bg-destructive/10 p-4">
          <Aviso texto={estado.erro} />
          <Botao onClick={() => void estado.recarregar()} disabled={estado.carregando}>
            Tentar de novo
          </Botao>
        </div>
      ) : selecao === null ? (
        <Tabs value={aba} onValueChange={(v) => setAba(String(v))}>
          <TabsList>
            <TabsTrigger value="geral">Áreas lado a lado</TabsTrigger>
            <TabsTrigger value="atas">Atas internas</TabsTrigger>
          </TabsList>
          <TabsContent value="geral">
            <VisaoGeral areas={areas} itens={estado.itens} onAbrirArea={(id) => escolher(id)} onAbrirItem={setAberto} />
          </TabsContent>
          <TabsContent value="atas">
            <Atas areaId={null} />
          </TabsContent>
        </Tabs>
      ) : (
        <Tabs value={aba} onValueChange={(v) => setAba(String(v))}>
          <TabsList>
            <TabsTrigger value="quadro">Quadro</TabsTrigger>
            <TabsTrigger value="produtos">Produtos</TabsTrigger>
            <TabsTrigger value="atas">Atas</TabsTrigger>
          </TabsList>
          <TabsContent value="quadro">
            <Quadro itens={estado.itens} produtos={estado.produtos} onAbrir={setAberto} />
          </TabsContent>
          <TabsContent value="produtos">
            <ListaProdutos
              produtos={estado.produtos}
              itens={estado.itens}
              onAbrirItem={setAberto}
              onNovoProduto={estado.criarProduto}
              onNovaFeature={(produtoId) => setNovaFeature({ produtoId })}
            />
          </TabsContent>
          <TabsContent value="atas">
            <Atas areaId={selecao} />
          </TabsContent>
        </Tabs>
      )}

      {emRito && selecao !== null && (
        <ModoRito
          area={nomeArea}
          itens={estado.itens}
          produtos={estado.produtos}
          onMover={estado.mover}
          onAtualizar={estado.atualizar}
          onNovaFeature={() => setNovaFeature({ produtoId: null })}
          onAbrir={setAberto}
          onEncerrar={estado.encerrarRito}
          onSair={sairDoRito}
        />
      )}

      {novaFeature && (
        <NovaFeature
          produtos={estado.produtos}
          produtoInicial={novaFeature.produtoId}
          onCriarProduto={estado.criarProduto}
          onCriar={criarFeature}
          onFechar={() => setNovaFeature(null)}
        />
      )}

      {itemAberto && (
        <ItemPainel
          item={itemAberto}
          produtos={estado.produtos}
          onAtualizar={estado.atualizar}
          onMover={estado.mover}
          onCriarProduto={estado.criarProduto}
          onFechar={() => setAberto(null)}
        />
      )}
    </div>
  );
}
