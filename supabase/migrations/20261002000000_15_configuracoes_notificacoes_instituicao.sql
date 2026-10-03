CREATE TABLE IF NOT EXISTS public.configuracoes_notificacoes_instituicao (
  id                 uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  instituicao_id     uuid        NOT NULL UNIQUE REFERENCES public.instituicoes(id) ON DELETE CASCADE,
  alertas_email      boolean     NOT NULL DEFAULT true,
  alertas_push       boolean     NOT NULL DEFAULT true,
  alertas_sms        boolean     NOT NULL DEFAULT false,
  comunicados_email  boolean     NOT NULL DEFAULT true,
  comunicados_push   boolean     NOT NULL DEFAULT true,
  comunicados_sms    boolean     NOT NULL DEFAULT false,
  atualizado_por     uuid        REFERENCES auth.users(id) ON DELETE SET NULL,
  atualizado_em      timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.configuracoes_notificacoes_instituicao ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "cni_select" ON public.configuracoes_notificacoes_instituicao;
DROP POLICY IF EXISTS "cni_insert" ON public.configuracoes_notificacoes_instituicao;
DROP POLICY IF EXISTS "cni_update" ON public.configuracoes_notificacoes_instituicao;

CREATE POLICY "cni_select" ON public.configuracoes_notificacoes_instituicao
  FOR SELECT TO authenticated
  USING (public.is_institution_member(instituicao_id));

CREATE POLICY "cni_insert" ON public.configuracoes_notificacoes_instituicao
  FOR INSERT TO authenticated
  WITH CHECK (public.is_institution_admin(instituicao_id));

CREATE POLICY "cni_update" ON public.configuracoes_notificacoes_instituicao
  FOR UPDATE TO authenticated
  USING (public.is_institution_admin(instituicao_id))
  WITH CHECK (public.is_institution_admin(instituicao_id));

GRANT SELECT, INSERT, UPDATE ON public.configuracoes_notificacoes_instituicao TO authenticated;