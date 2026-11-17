-- Ficha guiada de priorização: substitui o RICE de volume e impacto.
-- A nota mantém a forma alcance × ganho × confiança ÷ esforço, com novas escalas:
--   reach  = alcance: uma área (1), várias áreas (3), a empresa toda (5)
--   impact = ganho, de 1 a 5, calculado das respostas da ficha (tempo, cliente ou receita)
-- Valores da escala antiga que não cabem na nova são limpos (a nota volta a ser preenchida pela ficha).

update itens set reach = null where reach is not null and reach not in (1, 3, 5);
update itens set impact = null where impact is not null and impact not in (1, 2, 3, 4, 5);

alter table itens drop constraint if exists itens_reach_check;
alter table itens drop constraint if exists itens_impact_check;
alter table itens add constraint itens_reach_check check (reach in (1, 3, 5));
alter table itens add constraint itens_impact_check check (impact in (1, 2, 3, 4, 5));

-- De onde vem o ganho
alter table itens add column if not exists ganho_tipo text check (ganho_tipo in ('tempo', 'cliente', 'receita'));
alter table itens add column if not exists horas_mes numeric check (horas_mes >= 0);
alter table itens add column if not exists valor_hora numeric check (valor_hora >= 0);
alter table itens add column if not exists cliente text not null default '';
alter table itens add column if not exists tier text check (tier in ('bronze', 'prata', 'ouro', 'diamante'));
alter table itens add column if not exists risco_perda boolean;
alter table itens add column if not exists faixa_receita int check (faixa_receita between 1 and 4);

-- "Por que vale a pena?": o business case em poucas linhas
alter table itens add column if not exists justificativa text not null default '';

-- Ajuste manual da posição no ranking, sempre com motivo
alter table itens add column if not exists ajuste_score numeric;
alter table itens add column if not exists ajuste_motivo text not null default '';
