type Ouvinte = () => void;

const ouvintes = new Set<Ouvinte>();

export function aoExpirarSessao(ouvinte: Ouvinte): () => void {
  ouvintes.add(ouvinte);
  return () => {
    ouvintes.delete(ouvinte);
  };
}

export function sessaoExpirou() {
  ouvintes.forEach((ouvinte) => ouvinte());
}
