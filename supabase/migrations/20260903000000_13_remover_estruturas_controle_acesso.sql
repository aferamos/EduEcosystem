/*
  Remove as estruturas temporárias do Controle de Acesso institucional.
  Esta migration deve ser executada após a migration 12 caso ela já tenha
  sido aplicada no banco.
*/

DROP TABLE IF EXISTS public.permissoes_papel CASCADE;
DROP TABLE IF EXISTS public.papeis CASCADE;