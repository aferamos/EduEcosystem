/*
  Adiciona FK direta de perfis_usuario.usuario_id → perfis.id
  para que o Supabase resolva o relacionamento no schema cache
  e permita joins via PostgREST (supabase.from().select('*, perfis(...)'))
*/

-- Garante que todo usuario_id em perfis_usuario tem um perfil em perfis
-- (cria perfis faltantes usando o email do auth.users como nome temporário)
INSERT INTO public.perfis (id, nome_completo)
SELECT u.id, split_part(u.email, '@', 1)
FROM auth.users u
WHERE EXISTS (
  SELECT 1 FROM public.perfis_usuario pu WHERE pu.usuario_id = u.id
)
AND NOT EXISTS (
  SELECT 1 FROM public.perfis p WHERE p.id = u.id
)
ON CONFLICT (id) DO NOTHING;

-- Agora adiciona a FK
ALTER TABLE public.perfis_usuario
  DROP CONSTRAINT IF EXISTS fk_perfis_usuario_perfis;

ALTER TABLE public.perfis_usuario
  ADD CONSTRAINT fk_perfis_usuario_perfis
  FOREIGN KEY (usuario_id)
  REFERENCES public.perfis(id)
  ON DELETE CASCADE;
