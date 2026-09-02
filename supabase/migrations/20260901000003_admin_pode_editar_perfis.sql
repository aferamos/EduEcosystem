/*
  Permite que admins da instituição atualizem o perfil (nome) de qualquer membro.
  A policy anterior só permitia o próprio usuário editar seu perfil.
*/

-- Adiciona policy de UPDATE para admins em perfis
DROP POLICY IF EXISTS "perfis_update_admin" ON public.perfis;
CREATE POLICY "perfis_update_admin" ON public.perfis
  FOR UPDATE TO authenticated
  USING (
    -- o próprio usuário pode editar
    id = auth.uid()
    OR
    -- admin/coordenador de qualquer instituição onde esse usuário é membro também pode
    EXISTS (
      SELECT 1 FROM public.perfis_usuario pu_alvo
      JOIN public.perfis_usuario pu_admin
        ON pu_admin.instituicao_id = pu_alvo.instituicao_id
      WHERE pu_alvo.usuario_id = perfis.id
        AND pu_admin.usuario_id = auth.uid()
        AND pu_admin.perfil IN ('admin', 'coordenador', 'super_admin')
        AND pu_admin.ativo = true
    )
  )
  WITH CHECK (
    id = auth.uid()
    OR
    EXISTS (
      SELECT 1 FROM public.perfis_usuario pu_alvo
      JOIN public.perfis_usuario pu_admin
        ON pu_admin.instituicao_id = pu_alvo.instituicao_id
      WHERE pu_alvo.usuario_id = perfis.id
        AND pu_admin.usuario_id = auth.uid()
        AND pu_admin.perfil IN ('admin', 'coordenador', 'super_admin')
        AND pu_admin.ativo = true
    )
  );
