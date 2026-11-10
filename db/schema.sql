-- Base congelada = migration 0001. Mudanças novas de schema vão em db/migrations/NNNN_nome.sql, não aqui.
-- Rito de priorização: o que entra, o que vale um discovery e o que vale construir.
-- Idempotente: pode rodar de novo sem perder dados.

create table if not exists areas (
  id    serial primary key,
  nome  text not null unique
);

-- Produto = algo que existe e evolui (ex.: Multissistemas). Um produto tem N itens.
create table if not exists produtos (
  id         serial primary key,
  nome       text not null unique,
  descricao  text not null default '',
  status     text not null default 'entregue'
             check (status in ('entregue', 'em_implantacao', 'parado', 'em_construcao')),
  criado_em  timestamptz not null default now()
);

-- Um produto pode servir várias áreas (ex.: Multissistemas atende Suporte e Credenciados).
create table if not exists produto_areas (
  produto_id int not null references produtos(id) on delete cascade,
  area_id    int not null references areas(id) on delete cascade,
  primary key (produto_id, area_id)
);

-- Item = projeto ou feature grande. Pertence à área que pediu (setor solicitante).
create table if not exists itens (
  id            serial primary key,
  area_id       int not null references areas(id),
  produto_id    int references produtos(id) on delete set null,
  titulo        text not null,
  problema      text not null default '',
  solicitante   text not null default '',
  pilar         text check (pilar in ('eficiencia', 'decisao', 'capacitacao')),
  etapa         text not null default 'backlog'
                check (etapa in ('backlog', 'discovery', 'decidir', 'execucao', 'pausado', 'entregue', 'descartado')),
  reach         numeric check (reach >= 0),
  impact        numeric check (impact in (0.25, 0.5, 1, 2, 3)),
  confidence    numeric check (confidence in (0.5, 0.8, 1)),
  effort        numeric check (effort > 0),
  solucao       text not null default '',
  riscos        text not null default '',
  motivo        text not null default '',
  pipefy_url    text not null default '',
  criado_em     timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);
create index if not exists itens_area_etapa on itens (area_id, etapa);

-- Ritos: com uma área (area_id) ou a reunião interna da gestão (area_id nulo).
create table if not exists ritos (
  id           serial primary key,
  area_id      int references areas(id),
  iniciado_em  timestamptz not null default now(),
  encerrado_em timestamptz,
  ata          text not null default ''
);

-- Toda mudança de etapa fica registrada: é o histórico do item e a matéria-prima da ata.
create table if not exists movimentos (
  id        serial primary key,
  item_id   int not null references itens(id) on delete cascade,
  rito_id   int references ritos(id) on delete set null,
  de        text,
  para      text not null,
  nota      text not null default '',
  criado_em timestamptz not null default now()
);
create index if not exists movimentos_item on movimentos (item_id, criado_em);
