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
-- Carga inicial. Áreas = opções do campo "Setor do solicitante" do pipe Qualidade e Gestão.
insert into areas (nome) values
  ('Suporte'), ('Sales'), ('On Going'), ('On Boarding'), ('Segurança'), ('Saúde'),
  ('Credenciado'), ('Financeiro'), ('Suprimentos'), ('DP'), ('Operação (Filiais e Campanha)'),
  ('Qualidade e Gestão'), ('RH'), ('Diretoria'), ('Jurídico'), ('Legalização'), ('Brand'),
  ('Enablement'), ('Desenvolvimento'), ('Controladoria')
on conflict (nome) do nothing;

-- Produtos do Suporte (levantamento de 2026-11-04).
insert into produtos (nome, descricao, status) values
  ('Multissistemas', 'Painel no AppSheet com os ASOs e prontuários a lançar nos sistemas dos clientes.', 'entregue'),
  ('Convocação Eletrobras (AXIA)', 'Convocação automática dos colaboradores da AXIA para exames periódicos.', 'entregue'),
  ('Convocação MODEC', 'Identifica ASOs vencidos ou a vencer e convoca os colaboradores da MODEC por e-mail.', 'entregue'),
  ('Convocação SBM', 'Convocação quinzenal automática dos colaboradores da SBM Offshore com ASO a vencer.', 'parado'),
  ('SBM Alterações', 'Ligação entre o Pipe e o médico para tratar as pendências médicas da SBM.', 'parado'),
  ('SLA Abertta Saúde', 'Controle do prazo de liberação dos ASOs admissionais da Abertta em rede credenciada.', 'entregue'),
  ('Edição de ASO', 'Fluxo padronizado no Pipefy para os pedidos de edição de ASO.', 'entregue'),
  ('Briefing', 'E-mail diário para cada gestor com os prazos da sua carteira.', 'entregue'),
  ('Cloud Humans (ClaudIA)', 'IA de atendimento no WhatsApp e no e-mail do Suporte; hoje faz a triagem.', 'em_implantacao'),
  ('BI do Suporte', 'Painel gerencial com reprovações, urgências, SLA, retornos e NPS.', 'entregue'),
  ('BI do Cliente', 'Painéis de acompanhamento entregues aos clientes, como MODEC, International SOS e IKM.', 'entregue'),
  ('Pipefy SST e Concremat', 'Pipes, portais, formulários e automações do dia a dia do Suporte.', 'entregue'),
  ('Convocações (novos clientes)', 'Convocação automática para clientes que ainda não têm.', 'em_construcao'),
  ('Gestão de exames alterados', 'Acompanhamento e comunicação dos exames alterados aos clientes.', 'em_construcao')
on conflict (nome) do nothing;

insert into produto_areas (produto_id, area_id)
select p.id, a.id from produtos p, areas a where a.nome = 'Suporte'
on conflict do nothing;
