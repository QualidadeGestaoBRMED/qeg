-- Entregas já feitas ao Suporte, tiradas dos decks "Projetos CX <> QEG" e "Projetos entregues ao Suporte".
-- Entram como features entregues (ou pausadas), sem notas RICE, para dar histórico a cada produto.
-- Idempotente: só insere o título que ainda não existe.
with s as (select id from areas where nome = 'Suporte'),
novos (produto, titulo, problema, solucao, pilar, etapa) as (values
  ('Multissistemas', 'Multissistemas: painel de lançamentos nos sistemas dos clientes',
   'Controlar prazos e pendências de lançamento de ASOs e prontuários por cliente.',
   'AppSheet com as demandas do dia por empresa, com prazo e status (atrasado, pendente, a fazer, concluído), registro de pendências e acesso por grupo. Refeito em 2026 com fonte central de dados, sem automação por navegador no BR NET; novo fluxo em produção desde 11/08/2026. Mais de 30 entregas e ajustes.',
   'eficiencia', 'entregue'),
  ('Convocação Eletrobras (AXIA)', 'Convocação Eletrobras (AXIA)',
   'Convocar os colaboradores da AXIA para os exames periódicos sem trabalho manual.',
   'Primeira convocação 60 dias antes do vencimento e novas a cada 7 dias. A pedido da AXIA: 3ª e 4ª convocação, relatório a 30 dias e convocação de faltosos. Planilha + AppSheet.',
   'eficiencia', 'entregue'),
  ('Convocação MODEC', 'Convocação MODEC',
   'Substituir o processo manual de baixar, filtrar e cruzar o relatório de periódicos da MODEC.',
   'Identifica ASOs vencidos ou a vencer (até 60 dias antes por CPF, 90 por passaporte) a partir do Gestor de Periódicos e convoca por e-mail (só @modec). Gera histórico de convocados.',
   'eficiencia', 'entregue'),
  ('SBM Alterações', 'SBM Alterações: pendências médicas entre Pipe, médico e cliente',
   'Responder o cliente com a conduta médica sem troca manual de e-mails.',
   'Card em "Aguardando o Retorno do Cliente" no Pipe → o médico vê o caso no AppSheet → registra conduta e anexos → e-mail ao cliente sai automaticamente. Fluxo completo construído, hoje parado.',
   'eficiencia', 'pausado'),
  ('SLA Abertta Saúde', 'SLA Abertta Saúde',
   'Ver o que está em dia ou atrasado na liberação dos ASOs admissionais da Abertta e agir antes da cobrança do cliente.',
   'Busca os pedidos feitos em rede credenciada, calcula o prazo e classifica cada ASO (antecipado, em dia, atrasado). AppSheet usado pelo Suporte e pelos Credenciados.',
   'decisao', 'entregue'),
  ('Edição de ASO', 'Edição de ASO: fluxo no Pipefy',
   'Dar rastreio e prazo às correções de ASO pedidas pelos clientes.',
   'Fluxos AS IS e TO BE, formulário e pipe (exames alterados, atrasados, recoleta) e relatórios. 10 entregas.',
   'eficiencia', 'entregue'),
  ('Briefing', 'Briefing: newsletter diária de prazos',
   'O gestor começar o dia sabendo o que vence hoje e o que já atrasou.',
   'Todo dia útil às 06:45, lê os prazos do Pipefy e manda um e-mail para cada gestor com os vencidos e o que vence hoje. Tem versão em painel web.',
   'decisao', 'entregue'),
  ('Cloud Humans (ClaudIA)', 'ClaudIA: triagem no WhatsApp e no e-mail',
   'Fazer a triagem dos clientes do Suporte que chegam pelo WhatsApp e pelo e-mail.',
   'IA de atendimento com a triagem em produção. Os agentes de ASO e de PGR foram construídos, mas ainda não rodaram em produção (levantamento de 03/11).',
   'eficiencia', 'entregue'),
  ('BI do Suporte', 'BI do Suporte: painel gerencial',
   'Acompanhar o desempenho do Suporte com dados.',
   'Páginas de reprovações, urgências, SLA de primeira resposta, retornos, NPS (tiers, zonas, indicadores 2026) e BI de Handover. 43 entregas.',
   'decisao', 'entregue'),
  ('BI do Cliente', 'BI do Cliente: painéis para os clientes',
   'Dar ao cliente uma visão própria dos seus exames e pendências.',
   'Painéis para MODEC, Infotec, BEEP, Abelv, Bravante e Fratelli; links individuais para International SOS, IKM, Concrejato e outros. 21 entregas.',
   'decisao', 'entregue'),
  ('BI do Cliente', 'BI SBM Saúde Populacional: 4ª fase e painel executivo',
   'Dar à SBM a visão de saúde populacional dos seus colaboradores.',
   'Entregas da 4ª fase do BI de Saúde Populacional e do painel executivo.',
   'decisao', 'entregue'),
  ('Pipefy SST e Concremat', 'Pipefy SST, Demandas Internas e Concremat',
   'Organizar a entrada e o andamento das solicitações dos clientes.',
   'Pipe de Reuniões, Pipe de E-mails do Suporte, portal e formulário da CMAT, Portal Concremat Fase 2, automações Workato e templates de e-mail. 32 entregas.',
   'eficiencia', 'entregue')
),
inseridos as (
  insert into itens (area_id, produto_id, titulo, problema, solucao, solicitante, pilar, etapa)
  select (select id from s), p.id, n.titulo, n.problema, n.solucao, 'Suporte', n.pilar, n.etapa
  from novos n join produtos p on p.nome = n.produto
  where not exists (select 1 from itens i where i.titulo = n.titulo)
  returning id, etapa
)
insert into movimentos (item_id, de, para, nota)
select id, null, etapa, 'Carga inicial: entregas anteriores ao rito' from inseridos;
