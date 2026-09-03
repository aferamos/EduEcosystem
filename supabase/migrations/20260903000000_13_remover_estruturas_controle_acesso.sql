/*
  Remove somente a matriz de permissões por instituição.
  O catálogo de papéis continua existindo para a tela Controle de Acesso.
*/

DROP TABLE IF EXISTS public.permissoes_papel CASCADE;