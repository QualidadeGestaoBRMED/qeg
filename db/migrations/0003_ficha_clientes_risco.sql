-- Ficha: vários clientes por projeto e um quarto tipo de ganho, "reduz risco ou melhora o controle".
--   clientes    = lista de { nome, tier }; o ganho vem do maior tier (+1 com risco de perda)
--   nivel_risco = 1 a 4, para projetos que não economizam horas mas evitam erro, multa ou perda de contrato

alter table itens add column if not exists clientes jsonb not null default '[]'::jsonb;
alter table itens add column if not exists nivel_risco int check (nivel_risco between 1 and 4);

-- leva o cliente único da 0002 para a lista
update itens set clientes = jsonb_build_array(jsonb_build_object('nome', cliente, 'tier', tier))
where tier is not null and clientes = '[]'::jsonb;

alter table itens drop column if exists cliente;
alter table itens drop column if exists tier;

alter table itens drop constraint if exists itens_ganho_tipo_check;
alter table itens add constraint itens_ganho_tipo_check check (ganho_tipo in ('tempo', 'cliente', 'receita', 'risco'));
