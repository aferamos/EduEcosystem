/*
  Controle de Acesso institucional

  A estrutura anterior guarda os papéis dos usuários e as permissões padrão,
  mas não possui catálogo de papéis por instituição nem permite editar uma
  matriz de permissões sem afetar outras instituições.
*/

CREATE TABLE IF NOT EXISTS public.papeis (
  id               uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  instituicao_id   uuid        NOT NULL REFERENCES public.instituicoes(id) ON DELETE CASCADE,
  chave            text        NOT NULL,
  nome             text        NOT NULL,
  descricao        text,
  nivel_acesso     smallint    NOT NULL DEFAULT 1 CHECK (nivel_acesso BETWEEN 1 AND 5),
  sistema          boolean     NOT NULL DEFAULT false,
  ativo            boolean     NOT NULL DEFAULT true,
  criado_em        timestamptz NOT NULL DEFAULT now(),
  atualizado_em    timestamptz NOT NULL DEFAULT now(),
  UNIQUE (instituicao_id, chave)
);

CREATE TABLE IF NOT EXISTS public.permissoes_papel (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  papel_id    uuid        NOT NULL REFERENCES public.papeis(id) ON DELETE CASCADE,
  recurso     text        NOT NULL,
  acao        text        NOT NULL CHECK (acao IN ('read','create','update','delete','manage','export')),
  escopo      text        NOT NULL DEFAULT 'institution' CHECK (escopo IN ('own','institution','all')),
  criado_em   timestamptz NOT NULL DEFAULT now(),
  UNIQUE (papel_id, recurso, acao)
);

-- Papéis personalizados precisam ser aceitos nas associações existentes.
ALTER TABLE public.perfis_usuario
  DROP CONSTRAINT IF EXISTS perfis_usuario_perfil_check;

ALTER TABLE public.contexto_ativo
  DROP CONSTRAINT IF EXISTS contexto_ativo_perfil_check;

CREATE INDEX IF NOT EXISTS idx_papeis_instituicao
  ON public.papeis(instituicao_id);

CREATE INDEX IF NOT EXISTS idx_permissoes_papel_papel
  ON public.permissoes_papel(papel_id);

-- Representa os papéis padrão já existentes no modelo atual, sem apagar ou
-- substituir registros de perfis_usuario/permissoes_perfil.
INSERT INTO public.papeis (instituicao_id, chave, nome, descricao, nivel_acesso, sistema)
SELECT i.id, r.chave, r.nome, r.descricao, r.nivel_acesso, true
FROM public.instituicoes i
CROSS JOIN (
  VALUES
    ('super_admin', 'Super Administrador', 'Acesso global à plataforma', 5),
    ('admin', 'Administrador da Instituição', 'Governança completa da instituição', 5),
    ('coordenador', 'Coordenador', 'Gestão acadêmica e pedagógica', 4),
    ('professor', 'Professor', 'Operação de turmas, notas e frequência', 3),
    ('aluno', 'Aluno', 'Acompanhamento acadêmico individual', 1),
    ('responsavel', 'Responsável', 'Acompanhamento dos dependentes', 2)
) AS r(chave, nome, descricao, nivel_acesso)
WHERE EXISTS (
  SELECT 1
  FROM public.perfis_usuario pu
  WHERE pu.instituicao_id = i.id
)
ON CONFLICT (instituicao_id, chave) DO NOTHING;

-- Copia as permissões padrão para a matriz institucional editável.
INSERT INTO public.permissoes_papel (papel_id, recurso, acao, escopo)
SELECT p.id, pp.recurso, pp.acao, pp.escopo
FROM public.papeis p
JOIN public.permissoes_perfil pp ON pp.perfil = p.chave
ON CONFLICT (papel_id, recurso, acao) DO NOTHING;

ALTER TABLE public.papeis ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.permissoes_papel ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "papeis_select" ON public.papeis;
CREATE POLICY "papeis_select" ON public.papeis
  FOR SELECT TO authenticated
  USING (is_institution_member(instituicao_id));

DROP POLICY IF EXISTS "papeis_insert" ON public.papeis;
CREATE POLICY "papeis_insert" ON public.papeis
  FOR INSERT TO authenticated
  WITH CHECK (is_institution_admin(instituicao_id));

DROP POLICY IF EXISTS "papeis_update" ON public.papeis;
CREATE POLICY "papeis_update" ON public.papeis
  FOR UPDATE TO authenticated
  USING (is_institution_admin(instituicao_id))
  WITH CHECK (is_institution_admin(instituicao_id));

DROP POLICY IF EXISTS "papeis_delete" ON public.papeis;
CREATE POLICY "papeis_delete" ON public.papeis
  FOR DELETE TO authenticated
  USING (is_institution_admin(instituicao_id) AND sistema = false);

DROP POLICY IF EXISTS "permissoes_papel_select" ON public.permissoes_papel;
CREATE POLICY "permissoes_papel_select" ON public.permissoes_papel
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.papeis p
      WHERE p.id = papel_id
        AND is_institution_member(p.instituicao_id)
    )
  );

DROP POLICY IF EXISTS "permissoes_papel_insert" ON public.permissoes_papel;
CREATE POLICY "permissoes_papel_insert" ON public.permissoes_papel
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.papeis p
      WHERE p.id = papel_id
        AND is_institution_admin(p.instituicao_id)
    )
  );

DROP POLICY IF EXISTS "permissoes_papel_delete" ON public.permissoes_papel;
CREATE POLICY "permissoes_papel_delete" ON public.permissoes_papel
  FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.papeis p
      WHERE p.id = papel_id
        AND is_institution_admin(p.instituicao_id)
    )
  );