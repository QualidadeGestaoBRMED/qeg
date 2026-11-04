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
  ('Convocações (novos clientes)', 'Convocação automática para clientes que ainda não têm.', 'em_construcao')
on conflict (nome) do nothing;

insert into produto_areas (produto_id, area_id)
select p.id, a.id from produtos p, areas a where a.nome = 'Suporte'
on conflict do nothing;
