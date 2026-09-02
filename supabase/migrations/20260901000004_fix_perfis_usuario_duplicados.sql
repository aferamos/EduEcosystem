/*
  Remove registros duplicados de perfis_usuario:
  quando um usuário tem mais de um papel na mesma instituição,
  mantém apenas o mais recente (maior criado_em) e deleta os demais.
*/

DELETE FROM public.perfis_usuario
WHERE id NOT IN (
  SELECT DISTINCT ON (usuario_id, instituicao_id) id
  FROM public.perfis_usuario
  ORDER BY usuario_id, instituicao_id, criado_em DESC
);

/*
  Ajusta a unique constraint para ser (usuario_id, instituicao_id)
  — um usuário só pode ter UM papel por instituição.
  Se precisar de múltiplos papéis no futuro, isso precisaria mudar.
*/
ALTER TABLE public.perfis_usuario
  DROP CONSTRAINT IF EXISTS perfis_usuario_usuario_id_instituicao_id_perfil_key;

ALTER TABLE public.perfis_usuario
  ADD CONSTRAINT perfis_usuario_usuario_id_instituicao_id_key
  UNIQUE (usuario_id, instituicao_id);
