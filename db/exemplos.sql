-- Itens de exemplo do Suporte, tirados dos cards priorizados do pipe Qualidade e Gestão.
-- Só entram se ainda não houver nenhum item (o setup checa antes).
with s as (select id from areas where nome = 'Suporte'),
     p as (select id, nome from produtos)
insert into itens (area_id, produto_id, titulo, problema, solicitante, pilar, etapa, reach, impact, confidence, effort, pipefy_url)
values
  ((select id from s), (select id from p where nome = 'Briefing'),
   'Briefing: edições ao longo do dia', 'O gestor só recebe a fila de manhã e perde o que muda à tarde.', 'Suporte', 'eficiencia', 'execucao', 45, 1, 0.8, 2, ''),
  ((select id from s), (select id from p where nome = 'Convocações (novos clientes)'),
   'Convocação EDF', 'Convocação de periódicos da EDF ainda é manual.', 'Suporte', 'eficiencia', 'decidir', 300, 2, 0.8, 2, 'https://app.pipefy.com/open-cards/1405911249'),
  ((select id from s), (select id from p where nome = 'Convocações (novos clientes)'),
   'Convocação Log-In', 'Convocação de periódicos da Log-In ainda é manual.', 'Suporte', 'eficiencia', 'discovery', 200, 2, 0.5, null, 'https://app.pipefy.com/open-cards/1466870090'),
  ((select id from s), (select id from p where nome = 'Convocações (novos clientes)'),
   'Convocação OOG-TK', 'Convocação de periódicos da OOG-TK ainda é manual.', 'Suporte', 'eficiencia', 'backlog', 150, 2, 0.5, null, 'https://app.pipefy.com/open-cards/1350901870'),
  ((select id from s), (select id from p where nome = 'Convocações (novos clientes)'),
   'Convocação Prosafe', 'Convocação de periódicos da Prosafe ainda é manual.', 'Suporte', 'eficiencia', 'backlog', null, null, null, null, 'https://app.pipefy.com/open-cards/1405916113'),
  ((select id from s), (select id from p where nome = 'Gestão de exames alterados'),
   'Exames alterados International SOS', 'Exames alterados chegam ao cliente sem acompanhamento.', 'Suporte', 'decisao', 'backlog', null, null, null, null, 'https://app.pipefy.com/open-cards/1405891062'),
  ((select id from s), (select id from p where nome = 'Multissistemas'),
   'Novo BI Multissistemas', 'Falta visão das pendências de lançamento por cliente.', 'Suporte', 'decisao', 'backlog', 30, 1, 0.8, null, 'https://app.pipefy.com/open-cards/1225007661'),
  ((select id from s), (select id from p where nome = 'BI do Suporte'),
   'BI de rejeitados na triagem', 'Não sabemos onde e por que os pedidos são rejeitados.', 'Suporte', 'decisao', 'backlog', null, null, null, null, 'https://app.pipefy.com/open-cards/1335179144'),
  ((select id from s), (select id from p where nome = 'Convocação SBM'),
   'Retomar a Convocação SBM', 'Parou com a saída do responsável.', 'Suporte', 'eficiencia', 'pausado', 400, 2, 0.8, 3, '');

insert into movimentos (item_id, de, para, nota)
select id, null, etapa, 'Carga inicial' from itens;
