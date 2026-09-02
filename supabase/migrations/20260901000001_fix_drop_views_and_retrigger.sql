/*
================================================================================
  EduOne – Fix: Dropa views de compatibilidade EN + garante schema PT completo
  
  Execute no SQL Editor do Supabase caso a migration 09 tenha falhado.
  Este script é seguro para rodar múltiplas vezes (idempotente).
================================================================================
*/

-- ============================================================
-- PARTE 1: Dropa views de compatibilidade EN (se existirem)
-- Usamos DROP VIEW IF EXISTS para não falhar mesmo que já sejam tabelas.
-- ============================================================
DROP VIEW IF EXISTS public.audit_logs             CASCADE;
DROP VIEW IF EXISTS public.events                 CASCADE;
DROP VIEW IF EXISTS public.communications         CASCADE;
DROP VIEW IF EXISTS public.notifications          CASCADE;
DROP VIEW IF EXISTS public.occurrences            CASCADE;
DROP VIEW IF EXISTS public.grades                 CASCADE;
DROP VIEW IF EXISTS public.assessments            CASCADE;
DROP VIEW IF EXISTS public.attendance             CASCADE;
DROP VIEW IF EXISTS public.student_enrollments    CASCADE;
DROP VIEW IF EXISTS public.class_subjects         CASCADE;
DROP VIEW IF EXISTS public.subjects               CASCADE;
DROP VIEW IF EXISTS public.classes                CASCADE;
DROP VIEW IF EXISTS public.courses                CASCADE;
DROP VIEW IF EXISTS public.academic_periods       CASCADE;
DROP VIEW IF EXISTS public.role_permissions       CASCADE;
DROP VIEW IF EXISTS public.user_active_context    CASCADE;
DROP VIEW IF EXISTS public.user_settings          CASCADE;
DROP VIEW IF EXISTS public.user_sessions          CASCADE;
DROP VIEW IF EXISTS public.user_roles             CASCADE;
DROP VIEW IF EXISTS public.profiles               CASCADE;
DROP VIEW IF EXISTS public.institutions           CASCADE;

-- Views legadas de migration anteriores
DROP VIEW IF EXISTS public.v_class_enrollments          CASCADE;
DROP VIEW IF EXISTS public.v_council_summary            CASCADE;
DROP VIEW IF EXISTS public.v_notifications_unread_count CASCADE;
DROP VIEW IF EXISTS public.v_open_occurrences           CASCADE;
DROP VIEW IF EXISTS public.v_student_attendance_summary CASCADE;
DROP VIEW IF EXISTS public.v_student_grades_summary     CASCADE;
DROP VIEW IF EXISTS public.v_student_guardians_full     CASCADE;
DROP VIEW IF EXISTS public.v_students_full              CASCADE;
DROP VIEW IF EXISTS public.v_teacher_assignments_full   CASCADE;

-- ============================================================
-- PARTE 2: Dropa tabelas antigas EN (se ainda existirem como tabelas)
-- ============================================================
DROP TABLE IF EXISTS public.council_votes              CASCADE;
DROP TABLE IF EXISTS public.council_documents          CASCADE;
DROP TABLE IF EXISTS public.council_participants       CASCADE;
DROP TABLE IF EXISTS public.council_decisions          CASCADE;
DROP TABLE IF EXISTS public.councils                   CASCADE;
DROP TABLE IF EXISTS public.conversation_participants  CASCADE;
DROP TABLE IF EXISTS public.messages                   CASCADE;
DROP TABLE IF EXISTS public.conversations              CASCADE;
DROP TABLE IF EXISTS public.files                      CASCADE;
DROP TABLE IF EXISTS public.historical_grades          CASCADE;
DROP TABLE IF EXISTS public.historical_enrollments     CASCADE;
DROP TABLE IF EXISTS public.historical_occurrences     CASCADE;
DROP TABLE IF EXISTS public.institution_settings       CASCADE;
DROP TABLE IF EXISTS public.grade_levels               CASCADE;
DROP TABLE IF EXISTS public.school_years               CASCADE;
DROP TABLE IF EXISTS public.student_guardians          CASCADE;
DROP TABLE IF EXISTS public.teacher_assignments        CASCADE;
DROP TABLE IF EXISTS public.guardians                  CASCADE;
DROP TABLE IF EXISTS public.students                   CASCADE;
DROP TABLE IF EXISTS public.teachers                   CASCADE;
DROP TABLE IF EXISTS public.enrollments                CASCADE;
DROP TABLE IF EXISTS public.roles                      CASCADE;
DROP TABLE IF EXISTS public.permissions                CASCADE;

-- ============================================================
-- PARTE 3: Garante que as tabelas PT existem (cria se não existir)
-- ============================================================

-- instituicoes
CREATE TABLE IF NOT EXISTS public.instituicoes (
  id             uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  nome           text        NOT NULL,
  slug           text        UNIQUE NOT NULL,
  logo_url       text,
  cor_primaria   text        NOT NULL DEFAULT '#1A56DB',
  cor_secundaria text        NOT NULL DEFAULT '#0694A2',
  endereco       text,
  cidade         text,
  telefone       text,
  email          text,
  ativo          boolean     NOT NULL DEFAULT true,
  criado_em      timestamptz NOT NULL DEFAULT now(),
  atualizado_em  timestamptz NOT NULL DEFAULT now()
);

-- perfis
CREATE TABLE IF NOT EXISTS public.perfis (
  id              uuid        PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  nome_completo   text        NOT NULL DEFAULT '',
  avatar_url      text,
  telefone        text,
  data_nascimento date,
  criado_em       timestamptz NOT NULL DEFAULT now(),
  atualizado_em   timestamptz NOT NULL DEFAULT now()
);

-- perfis_usuario
CREATE TABLE IF NOT EXISTS public.perfis_usuario (
  id             uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_id     uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  instituicao_id uuid        NOT NULL REFERENCES public.instituicoes(id) ON DELETE CASCADE,
  perfil         text        NOT NULL CHECK (perfil IN ('super_admin','admin','coordenador','professor','aluno','responsavel')),
  ativo          boolean     NOT NULL DEFAULT true,
  criado_em      timestamptz NOT NULL DEFAULT now(),
  UNIQUE(usuario_id, instituicao_id, perfil)
);

-- sessoes_usuario
CREATE TABLE IF NOT EXISTS public.sessoes_usuario (
  id               uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_id       uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  nome_dispositivo text,
  tipo_dispositivo text        CHECK (tipo_dispositivo IN ('mobile','tablet','desktop','web')),
  sistema          text,
  ip               text,
  ultimo_acesso    timestamptz NOT NULL DEFAULT now(),
  criado_em        timestamptz NOT NULL DEFAULT now(),
  expira_em        timestamptz
);

-- configuracoes_usuario
CREATE TABLE IF NOT EXISTS public.configuracoes_usuario (
  id               uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_id       uuid        NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  notif_email      boolean     NOT NULL DEFAULT true,
  notif_push       boolean     NOT NULL DEFAULT true,
  notif_sms        boolean     NOT NULL DEFAULT false,
  idioma           text        NOT NULL DEFAULT 'pt-BR',
  tema             text        NOT NULL DEFAULT 'light' CHECK (tema IN ('light','dark','system')),
  fuso_horario     text        NOT NULL DEFAULT 'America/Sao_Paulo',
  login_biometrico boolean     NOT NULL DEFAULT false,
  atualizado_em    timestamptz NOT NULL DEFAULT now()
);

-- contexto_ativo
CREATE TABLE IF NOT EXISTS public.contexto_ativo (
  usuario_id     uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  instituicao_id uuid REFERENCES public.instituicoes(id) ON DELETE SET NULL,
  perfil         text CHECK (perfil IN ('super_admin','admin','coordenador','professor','aluno','responsavel')),
  perfil_id      uuid REFERENCES public.perfis(id) ON DELETE SET NULL,
  atualizado_em  timestamptz NOT NULL DEFAULT now()
);

-- permissoes_perfil
CREATE TABLE IF NOT EXISTS public.permissoes_perfil (
  id        uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  perfil    text NOT NULL CHECK (perfil IN ('super_admin','admin','coordenador','professor','aluno','responsavel')),
  recurso   text NOT NULL,
  acao      text NOT NULL CHECK (acao IN ('read','create','update','delete','manage','export')),
  escopo    text NOT NULL DEFAULT 'own' CHECK (escopo IN ('own','institution','all')),
  criado_em timestamptz NOT NULL DEFAULT now(),
  UNIQUE(perfil, recurso, acao)
);

-- periodos_letivos
CREATE TABLE IF NOT EXISTS public.periodos_letivos (
  id             uuid    PRIMARY KEY DEFAULT gen_random_uuid(),
  instituicao_id uuid    NOT NULL REFERENCES public.instituicoes(id) ON DELETE CASCADE,
  nome           text    NOT NULL,
  tipo           text    NOT NULL CHECK (tipo IN ('bimestre','trimestre','semestre','anual')),
  data_inicio    date    NOT NULL,
  data_fim       date    NOT NULL,
  ano            integer NOT NULL,
  ativo          boolean NOT NULL DEFAULT true,
  criado_em      timestamptz NOT NULL DEFAULT now()
);

-- cursos
CREATE TABLE IF NOT EXISTS public.cursos (
  id             uuid    PRIMARY KEY DEFAULT gen_random_uuid(),
  instituicao_id uuid    NOT NULL REFERENCES public.instituicoes(id) ON DELETE CASCADE,
  nome           text    NOT NULL,
  nivel          text    NOT NULL DEFAULT 'fundamental',
  duracao_anos   integer NOT NULL DEFAULT 1,
  ativo          boolean NOT NULL DEFAULT true,
  criado_em      timestamptz NOT NULL DEFAULT now()
);

-- turmas
CREATE TABLE IF NOT EXISTS public.turmas (
  id             uuid    PRIMARY KEY DEFAULT gen_random_uuid(),
  instituicao_id uuid    NOT NULL REFERENCES public.instituicoes(id) ON DELETE CASCADE,
  curso_id       uuid    REFERENCES public.cursos(id) ON DELETE SET NULL,
  nome           text    NOT NULL,
  ano            integer NOT NULL,
  turno          text    CHECK (turno IN ('manha','tarde','noite','integral')),
  max_alunos     integer NOT NULL DEFAULT 40,
  ativo          boolean NOT NULL DEFAULT true,
  criado_em      timestamptz NOT NULL DEFAULT now()
);

-- disciplinas
CREATE TABLE IF NOT EXISTS public.disciplinas (
  id             uuid    PRIMARY KEY DEFAULT gen_random_uuid(),
  instituicao_id uuid    NOT NULL REFERENCES public.instituicoes(id) ON DELETE CASCADE,
  nome           text    NOT NULL,
  codigo         text,
  carga_horaria  integer,
  ativo          boolean NOT NULL DEFAULT true,
  criado_em      timestamptz NOT NULL DEFAULT now()
);

-- turma_disciplinas
CREATE TABLE IF NOT EXISTS public.turma_disciplinas (
  id             uuid    PRIMARY KEY DEFAULT gen_random_uuid(),
  turma_id       uuid    NOT NULL REFERENCES public.turmas(id) ON DELETE CASCADE,
  disciplina_id  uuid    NOT NULL REFERENCES public.disciplinas(id) ON DELETE CASCADE,
  professor_id   uuid    REFERENCES auth.users(id) ON DELETE SET NULL,
  horas_semanais integer NOT NULL DEFAULT 2,
  criado_em      timestamptz NOT NULL DEFAULT now(),
  UNIQUE(turma_id, disciplina_id)
);

-- matriculas
CREATE TABLE IF NOT EXISTS public.matriculas (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  aluno_id         uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  turma_id         uuid NOT NULL REFERENCES public.turmas(id) ON DELETE CASCADE,
  instituicao_id   uuid NOT NULL REFERENCES public.instituicoes(id) ON DELETE CASCADE,
  numero_matricula text,
  data_matricula   date NOT NULL DEFAULT CURRENT_DATE,
  situacao         text NOT NULL DEFAULT 'ativo' CHECK (situacao IN ('ativo','transferido','concluido','cancelado')),
  criado_em        timestamptz NOT NULL DEFAULT now(),
  UNIQUE(aluno_id, turma_id)
);

-- frequencias
CREATE TABLE IF NOT EXISTS public.frequencias (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  turma_disciplina_id uuid NOT NULL REFERENCES public.turma_disciplinas(id) ON DELETE CASCADE,
  aluno_id            uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  data                date NOT NULL,
  situacao            text NOT NULL CHECK (situacao IN ('presente','falta','justificado','atraso')),
  observacao          text,
  registrado_por      uuid REFERENCES auth.users(id),
  criado_em           timestamptz NOT NULL DEFAULT now(),
  UNIQUE(turma_disciplina_id, aluno_id, data)
);

-- avaliacoes
CREATE TABLE IF NOT EXISTS public.avaliacoes (
  id                  uuid         PRIMARY KEY DEFAULT gen_random_uuid(),
  turma_disciplina_id uuid         NOT NULL REFERENCES public.turma_disciplinas(id) ON DELETE CASCADE,
  periodo_letivo_id   uuid         REFERENCES public.periodos_letivos(id) ON DELETE SET NULL,
  titulo              text         NOT NULL,
  tipo                text         NOT NULL CHECK (tipo IN ('prova','teste','trabalho','projeto','quiz','recuperacao')),
  data                date,
  nota_maxima         numeric(5,2) NOT NULL DEFAULT 10,
  peso                numeric(3,2) NOT NULL DEFAULT 1,
  criado_em           timestamptz  NOT NULL DEFAULT now()
);

-- notas
CREATE TABLE IF NOT EXISTS public.notas (
  id           uuid         PRIMARY KEY DEFAULT gen_random_uuid(),
  avaliacao_id uuid         NOT NULL REFERENCES public.avaliacoes(id) ON DELETE CASCADE,
  aluno_id     uuid         NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  nota         numeric(5,2),
  situacao     text         NOT NULL DEFAULT 'pendente' CHECK (situacao IN ('pendente','lancada','falta','dispensado')),
  observacao   text,
  lancado_por  uuid         REFERENCES auth.users(id),
  lancado_em   timestamptz,
  criado_em    timestamptz  NOT NULL DEFAULT now(),
  UNIQUE(avaliacao_id, aluno_id)
);

-- ocorrencias
CREATE TABLE IF NOT EXISTS public.ocorrencias (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  instituicao_id uuid NOT NULL REFERENCES public.instituicoes(id) ON DELETE CASCADE,
  aluno_id       uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  registrado_por uuid NOT NULL REFERENCES auth.users(id),
  turma_id       uuid REFERENCES public.turmas(id) ON DELETE SET NULL,
  tipo           text NOT NULL CHECK (tipo IN ('disciplinar','academico','comportamental','elogio','observacao')),
  titulo         text NOT NULL,
  descricao      text,
  gravidade      text CHECK (gravidade IN ('baixa','media','alta')),
  situacao       text NOT NULL DEFAULT 'aberta' CHECK (situacao IN ('aberta','em_andamento','resolvida','encerrada')),
  criado_em      timestamptz NOT NULL DEFAULT now(),
  atualizado_em  timestamptz NOT NULL DEFAULT now()
);

-- notificacoes
CREATE TABLE IF NOT EXISTS public.notificacoes (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  instituicao_id uuid NOT NULL REFERENCES public.instituicoes(id) ON DELETE CASCADE,
  destinatario_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  remetente_id   uuid REFERENCES auth.users(id),
  titulo         text NOT NULL,
  mensagem       text NOT NULL,
  tipo           text NOT NULL DEFAULT 'info' CHECK (tipo IN ('info','alerta','sucesso','urgente','nota','frequencia','ocorrencia')),
  lida           boolean NOT NULL DEFAULT false,
  dados          jsonb,
  criado_em      timestamptz NOT NULL DEFAULT now()
);

-- comunicados
CREATE TABLE IF NOT EXISTS public.comunicados (
  id             uuid    PRIMARY KEY DEFAULT gen_random_uuid(),
  instituicao_id uuid    NOT NULL REFERENCES public.instituicoes(id) ON DELETE CASCADE,
  remetente_id   uuid    NOT NULL REFERENCES auth.users(id),
  titulo         text    NOT NULL,
  mensagem       text    NOT NULL,
  publico        text[]  NOT NULL DEFAULT '{}',
  turmas_ids     uuid[]  NOT NULL DEFAULT '{}',
  fixado         boolean NOT NULL DEFAULT false,
  publicado_em   timestamptz NOT NULL DEFAULT now(),
  criado_em      timestamptz NOT NULL DEFAULT now()
);

-- eventos
CREATE TABLE IF NOT EXISTS public.eventos (
  id             uuid    PRIMARY KEY DEFAULT gen_random_uuid(),
  instituicao_id uuid    NOT NULL REFERENCES public.instituicoes(id) ON DELETE CASCADE,
  titulo         text    NOT NULL,
  descricao      text,
  data_evento    date    NOT NULL,
  data_fim       date,
  tipo           text    NOT NULL DEFAULT 'geral' CHECK (tipo IN ('feriado','avaliacao','reuniao','atividade','geral')),
  turmas_ids     uuid[]  NOT NULL DEFAULT '{}',
  criado_por     uuid    REFERENCES auth.users(id),
  criado_em      timestamptz NOT NULL DEFAULT now()
);

-- logs_auditoria
CREATE TABLE IF NOT EXISTS public.logs_auditoria (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  instituicao_id   uuid REFERENCES public.instituicoes(id) ON DELETE SET NULL,
  usuario_id       uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  acao             text NOT NULL,
  tipo_recurso     text NOT NULL,
  recurso_id       uuid,
  dados_anteriores jsonb,
  dados_novos      jsonb,
  ip               text,
  criado_em        timestamptz NOT NULL DEFAULT now()
);

-- ============================================================
-- PARTE 4: Índices (IF NOT EXISTS para ser idempotente)
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_perfis_usuario_usuario    ON public.perfis_usuario(usuario_id);
CREATE INDEX IF NOT EXISTS idx_perfis_usuario_inst       ON public.perfis_usuario(instituicao_id);
CREATE INDEX IF NOT EXISTS idx_matriculas_aluno          ON public.matriculas(aluno_id);
CREATE INDEX IF NOT EXISTS idx_matriculas_turma          ON public.matriculas(turma_id);
CREATE INDEX IF NOT EXISTS idx_frequencias_td            ON public.frequencias(turma_disciplina_id);
CREATE INDEX IF NOT EXISTS idx_frequencias_aluno         ON public.frequencias(aluno_id);
CREATE INDEX IF NOT EXISTS idx_frequencias_data          ON public.frequencias(data);
CREATE INDEX IF NOT EXISTS idx_notas_aluno               ON public.notas(aluno_id);
CREATE INDEX IF NOT EXISTS idx_notas_avaliacao           ON public.notas(avaliacao_id);
CREATE INDEX IF NOT EXISTS idx_notificacoes_destinatario ON public.notificacoes(destinatario_id);
CREATE INDEX IF NOT EXISTS idx_notificacoes_lida         ON public.notificacoes(destinatario_id, lida);
CREATE INDEX IF NOT EXISTS idx_ocorrencias_aluno         ON public.ocorrencias(aluno_id);
CREATE INDEX IF NOT EXISTS idx_ocorrencias_inst          ON public.ocorrencias(instituicao_id);
CREATE INDEX IF NOT EXISTS idx_sessoes_usuario           ON public.sessoes_usuario(usuario_id);
CREATE INDEX IF NOT EXISTS idx_td_professor              ON public.turma_disciplinas(professor_id);
CREATE INDEX IF NOT EXISTS idx_permissoes_perfil_perfil  ON public.permissoes_perfil(perfil);
CREATE INDEX IF NOT EXISTS idx_logs_inst                 ON public.logs_auditoria(instituicao_id);

-- ============================================================
-- PARTE 5: RLS
-- ============================================================
ALTER TABLE public.instituicoes          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.perfis                ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.perfis_usuario        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sessoes_usuario       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.configuracoes_usuario ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contexto_ativo        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.permissoes_perfil     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.periodos_letivos      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cursos                ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.turmas                ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.disciplinas           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.turma_disciplinas     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.matriculas            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.frequencias           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.avaliacoes            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notas                 ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ocorrencias           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notificacoes          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.comunicados           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.eventos               ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.logs_auditoria        ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- PARTE 6: Funções helper (recria com OR REPLACE)
-- ============================================================
CREATE OR REPLACE FUNCTION public.get_user_institution_ids()
RETURNS uuid[] LANGUAGE sql SECURITY DEFINER STABLE AS $$
  SELECT coalesce(array_agg(instituicao_id), '{}')
  FROM public.perfis_usuario
  WHERE usuario_id = auth.uid() AND ativo = true;
$$;

CREATE OR REPLACE FUNCTION public.is_institution_admin(inst_id uuid)
RETURNS boolean LANGUAGE sql SECURITY DEFINER STABLE AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.perfis_usuario
    WHERE usuario_id = auth.uid()
      AND instituicao_id = inst_id
      AND perfil IN ('super_admin','admin')
      AND ativo = true
  );
$$;

CREATE OR REPLACE FUNCTION public.is_institution_teacher(inst_id uuid)
RETURNS boolean LANGUAGE sql SECURITY DEFINER STABLE AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.perfis_usuario
    WHERE usuario_id = auth.uid()
      AND instituicao_id = inst_id
      AND perfil = 'professor'
      AND ativo = true
  );
$$;

CREATE OR REPLACE FUNCTION public.is_institution_member(inst_id uuid)
RETURNS boolean LANGUAGE sql SECURITY DEFINER STABLE AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.perfis_usuario
    WHERE usuario_id = auth.uid()
      AND instituicao_id = inst_id
      AND ativo = true
  );
$$;

-- ============================================================
-- PARTE 7: Políticas RLS (DROP + CREATE para ser idempotente)
-- ============================================================

-- instituicoes
DROP POLICY IF EXISTS "inst_select"      ON public.instituicoes;
DROP POLICY IF EXISTS "inst_insert_auth" ON public.instituicoes;
DROP POLICY IF EXISTS "inst_insert_anon" ON public.instituicoes;
DROP POLICY IF EXISTS "inst_update"      ON public.instituicoes;
CREATE POLICY "inst_select"      ON public.instituicoes FOR SELECT TO authenticated USING (id = ANY(get_user_institution_ids()));
CREATE POLICY "inst_insert_auth" ON public.instituicoes FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "inst_insert_anon" ON public.instituicoes FOR INSERT TO anon         WITH CHECK (true);
CREATE POLICY "inst_update"      ON public.instituicoes FOR UPDATE TO authenticated USING (is_institution_admin(id)) WITH CHECK (is_institution_admin(id));

-- perfis
DROP POLICY IF EXISTS "perfis_select"      ON public.perfis;
DROP POLICY IF EXISTS "perfis_insert_auth" ON public.perfis;
DROP POLICY IF EXISTS "perfis_insert_anon" ON public.perfis;
DROP POLICY IF EXISTS "perfis_update"      ON public.perfis;
CREATE POLICY "perfis_select"      ON public.perfis FOR SELECT TO authenticated USING (true);
CREATE POLICY "perfis_insert_auth" ON public.perfis FOR INSERT TO authenticated WITH CHECK (id = auth.uid());
CREATE POLICY "perfis_insert_anon" ON public.perfis FOR INSERT TO anon         WITH CHECK (true);
CREATE POLICY "perfis_update"      ON public.perfis FOR UPDATE TO authenticated USING (id = auth.uid()) WITH CHECK (id = auth.uid());

-- perfis_usuario
DROP POLICY IF EXISTS "pu_select"      ON public.perfis_usuario;
DROP POLICY IF EXISTS "pu_insert_auth" ON public.perfis_usuario;
DROP POLICY IF EXISTS "pu_insert_anon" ON public.perfis_usuario;
DROP POLICY IF EXISTS "pu_update"      ON public.perfis_usuario;
DROP POLICY IF EXISTS "pu_delete"      ON public.perfis_usuario;
CREATE POLICY "pu_select"      ON public.perfis_usuario FOR SELECT TO authenticated USING (usuario_id = auth.uid() OR is_institution_admin(instituicao_id));
CREATE POLICY "pu_insert_auth" ON public.perfis_usuario FOR INSERT TO authenticated WITH CHECK (is_institution_admin(instituicao_id) OR usuario_id = auth.uid());
CREATE POLICY "pu_insert_anon" ON public.perfis_usuario FOR INSERT TO anon         WITH CHECK (true);
CREATE POLICY "pu_update"      ON public.perfis_usuario FOR UPDATE TO authenticated USING (is_institution_admin(instituicao_id)) WITH CHECK (is_institution_admin(instituicao_id));
CREATE POLICY "pu_delete"      ON public.perfis_usuario FOR DELETE TO authenticated USING (is_institution_admin(instituicao_id));

-- sessoes_usuario
DROP POLICY IF EXISTS "su_select" ON public.sessoes_usuario;
DROP POLICY IF EXISTS "su_insert" ON public.sessoes_usuario;
DROP POLICY IF EXISTS "su_update" ON public.sessoes_usuario;
DROP POLICY IF EXISTS "su_delete" ON public.sessoes_usuario;
CREATE POLICY "su_select" ON public.sessoes_usuario FOR SELECT TO authenticated USING (usuario_id = auth.uid());
CREATE POLICY "su_insert" ON public.sessoes_usuario FOR INSERT TO authenticated WITH CHECK (usuario_id = auth.uid());
CREATE POLICY "su_update" ON public.sessoes_usuario FOR UPDATE TO authenticated USING (usuario_id = auth.uid());
CREATE POLICY "su_delete" ON public.sessoes_usuario FOR DELETE TO authenticated USING (usuario_id = auth.uid());

-- configuracoes_usuario
DROP POLICY IF EXISTS "cu_select"      ON public.configuracoes_usuario;
DROP POLICY IF EXISTS "cu_insert_auth" ON public.configuracoes_usuario;
DROP POLICY IF EXISTS "cu_insert_anon" ON public.configuracoes_usuario;
DROP POLICY IF EXISTS "cu_update"      ON public.configuracoes_usuario;
CREATE POLICY "cu_select"      ON public.configuracoes_usuario FOR SELECT TO authenticated USING (usuario_id = auth.uid());
CREATE POLICY "cu_insert_auth" ON public.configuracoes_usuario FOR INSERT TO authenticated WITH CHECK (usuario_id = auth.uid());
CREATE POLICY "cu_insert_anon" ON public.configuracoes_usuario FOR INSERT TO anon         WITH CHECK (true);
CREATE POLICY "cu_update"      ON public.configuracoes_usuario FOR UPDATE TO authenticated USING (usuario_id = auth.uid());

-- contexto_ativo
DROP POLICY IF EXISTS "ca_select"      ON public.contexto_ativo;
DROP POLICY IF EXISTS "ca_insert_auth" ON public.contexto_ativo;
DROP POLICY IF EXISTS "ca_insert_anon" ON public.contexto_ativo;
DROP POLICY IF EXISTS "ca_update"      ON public.contexto_ativo;
CREATE POLICY "ca_select"      ON public.contexto_ativo FOR SELECT TO authenticated USING (usuario_id = auth.uid());
CREATE POLICY "ca_insert_auth" ON public.contexto_ativo FOR INSERT TO authenticated WITH CHECK (usuario_id = auth.uid());
CREATE POLICY "ca_insert_anon" ON public.contexto_ativo FOR INSERT TO anon         WITH CHECK (true);
CREATE POLICY "ca_update"      ON public.contexto_ativo FOR UPDATE TO authenticated USING (usuario_id = auth.uid());

-- permissoes_perfil
DROP POLICY IF EXISTS "pp_select" ON public.permissoes_perfil;
CREATE POLICY "pp_select" ON public.permissoes_perfil FOR SELECT TO authenticated USING (true);

-- cursos / turmas / disciplinas / periodos_letivos
DROP POLICY IF EXISTS "cursos_select" ON public.cursos; DROP POLICY IF EXISTS "cursos_write" ON public.cursos;
CREATE POLICY "cursos_select" ON public.cursos FOR SELECT TO authenticated USING (is_institution_member(instituicao_id));
CREATE POLICY "cursos_write"  ON public.cursos FOR ALL    TO authenticated USING (is_institution_admin(instituicao_id));

DROP POLICY IF EXISTS "turmas_select" ON public.turmas; DROP POLICY IF EXISTS "turmas_write" ON public.turmas;
CREATE POLICY "turmas_select" ON public.turmas FOR SELECT TO authenticated USING (is_institution_member(instituicao_id));
CREATE POLICY "turmas_write"  ON public.turmas FOR ALL    TO authenticated USING (is_institution_admin(instituicao_id));

DROP POLICY IF EXISTS "disc_select" ON public.disciplinas; DROP POLICY IF EXISTS "disc_write" ON public.disciplinas;
CREATE POLICY "disc_select" ON public.disciplinas FOR SELECT TO authenticated USING (is_institution_member(instituicao_id));
CREATE POLICY "disc_write"  ON public.disciplinas FOR ALL    TO authenticated USING (is_institution_admin(instituicao_id));

DROP POLICY IF EXISTS "pl_select" ON public.periodos_letivos; DROP POLICY IF EXISTS "pl_write" ON public.periodos_letivos;
CREATE POLICY "pl_select" ON public.periodos_letivos FOR SELECT TO authenticated USING (is_institution_member(instituicao_id));
CREATE POLICY "pl_write"  ON public.periodos_letivos FOR ALL    TO authenticated USING (is_institution_admin(instituicao_id));

-- turma_disciplinas
DROP POLICY IF EXISTS "td_select" ON public.turma_disciplinas; DROP POLICY IF EXISTS "td_write" ON public.turma_disciplinas;
CREATE POLICY "td_select" ON public.turma_disciplinas FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.turmas t WHERE t.id = turma_id AND is_institution_member(t.instituicao_id)));
CREATE POLICY "td_write"  ON public.turma_disciplinas FOR ALL    TO authenticated
  USING (EXISTS (SELECT 1 FROM public.turmas t WHERE t.id = turma_id AND is_institution_admin(t.instituicao_id)));

-- matriculas
DROP POLICY IF EXISTS "mat_select" ON public.matriculas; DROP POLICY IF EXISTS "mat_write" ON public.matriculas;
CREATE POLICY "mat_select" ON public.matriculas FOR SELECT TO authenticated
  USING (aluno_id = auth.uid() OR is_institution_admin(instituicao_id) OR is_institution_teacher(instituicao_id));
CREATE POLICY "mat_write"  ON public.matriculas FOR ALL    TO authenticated USING (is_institution_admin(instituicao_id));

-- frequencias
DROP POLICY IF EXISTS "freq_select" ON public.frequencias;
DROP POLICY IF EXISTS "freq_insert" ON public.frequencias;
DROP POLICY IF EXISTS "freq_update" ON public.frequencias;
CREATE POLICY "freq_select" ON public.frequencias FOR SELECT TO authenticated
  USING (aluno_id = auth.uid() OR registrado_por = auth.uid() OR
         EXISTS (SELECT 1 FROM public.turma_disciplinas td JOIN public.turmas t ON t.id = td.turma_id
                 WHERE td.id = turma_disciplina_id AND is_institution_admin(t.instituicao_id)));
CREATE POLICY "freq_insert" ON public.frequencias FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.turma_disciplinas td WHERE td.id = turma_disciplina_id AND td.professor_id = auth.uid())
    OR EXISTS (SELECT 1 FROM public.turma_disciplinas td JOIN public.turmas t ON t.id = td.turma_id
               WHERE td.id = turma_disciplina_id AND is_institution_admin(t.instituicao_id)));
CREATE POLICY "freq_update" ON public.frequencias FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.turma_disciplinas td WHERE td.id = turma_disciplina_id AND td.professor_id = auth.uid())
    OR EXISTS (SELECT 1 FROM public.turma_disciplinas td JOIN public.turmas t ON t.id = td.turma_id
               WHERE td.id = turma_disciplina_id AND is_institution_admin(t.instituicao_id)));

-- avaliacoes
DROP POLICY IF EXISTS "aval_select" ON public.avaliacoes; DROP POLICY IF EXISTS "aval_write" ON public.avaliacoes;
CREATE POLICY "aval_select" ON public.avaliacoes FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.turma_disciplinas td JOIN public.turmas t ON t.id = td.turma_id
                 WHERE td.id = turma_disciplina_id AND is_institution_member(t.instituicao_id)));
CREATE POLICY "aval_write"  ON public.avaliacoes FOR ALL    TO authenticated
  USING (EXISTS (SELECT 1 FROM public.turma_disciplinas td WHERE td.id = turma_disciplina_id AND td.professor_id = auth.uid())
    OR EXISTS (SELECT 1 FROM public.turma_disciplinas td JOIN public.turmas t ON t.id = td.turma_id
               WHERE td.id = turma_disciplina_id AND is_institution_admin(t.instituicao_id)));

-- notas
DROP POLICY IF EXISTS "notas_select" ON public.notas; DROP POLICY IF EXISTS "notas_write" ON public.notas;
CREATE POLICY "notas_select" ON public.notas FOR SELECT TO authenticated
  USING (aluno_id = auth.uid() OR lancado_por = auth.uid() OR
         EXISTS (SELECT 1 FROM public.avaliacoes a JOIN public.turma_disciplinas td ON td.id = a.turma_disciplina_id
                 JOIN public.turmas t ON t.id = td.turma_id WHERE a.id = avaliacao_id AND is_institution_admin(t.instituicao_id)));
CREATE POLICY "notas_write"  ON public.notas FOR ALL    TO authenticated
  USING (EXISTS (SELECT 1 FROM public.avaliacoes a JOIN public.turma_disciplinas td ON td.id = a.turma_disciplina_id
                 WHERE a.id = avaliacao_id AND td.professor_id = auth.uid())
    OR EXISTS (SELECT 1 FROM public.avaliacoes a JOIN public.turma_disciplinas td ON td.id = a.turma_disciplina_id
               JOIN public.turmas t ON t.id = td.turma_id WHERE a.id = avaliacao_id AND is_institution_admin(t.instituicao_id)));

-- ocorrencias
DROP POLICY IF EXISTS "ocorr_select" ON public.ocorrencias;
DROP POLICY IF EXISTS "ocorr_insert" ON public.ocorrencias;
DROP POLICY IF EXISTS "ocorr_update" ON public.ocorrencias;
DROP POLICY IF EXISTS "ocorr_delete" ON public.ocorrencias;
CREATE POLICY "ocorr_select" ON public.ocorrencias FOR SELECT TO authenticated
  USING (aluno_id = auth.uid() OR registrado_por = auth.uid() OR is_institution_admin(instituicao_id) OR is_institution_teacher(instituicao_id));
CREATE POLICY "ocorr_insert" ON public.ocorrencias FOR INSERT TO authenticated
  WITH CHECK (is_institution_admin(instituicao_id) OR is_institution_teacher(instituicao_id));
CREATE POLICY "ocorr_update" ON public.ocorrencias FOR UPDATE TO authenticated
  USING (registrado_por = auth.uid() OR is_institution_admin(instituicao_id));
CREATE POLICY "ocorr_delete" ON public.ocorrencias FOR DELETE TO authenticated
  USING (is_institution_admin(instituicao_id));

-- notificacoes
DROP POLICY IF EXISTS "notif_select" ON public.notificacoes;
DROP POLICY IF EXISTS "notif_insert" ON public.notificacoes;
DROP POLICY IF EXISTS "notif_update" ON public.notificacoes;
DROP POLICY IF EXISTS "notif_delete" ON public.notificacoes;
CREATE POLICY "notif_select" ON public.notificacoes FOR SELECT TO authenticated USING (destinatario_id = auth.uid());
CREATE POLICY "notif_insert" ON public.notificacoes FOR INSERT TO authenticated
  WITH CHECK (is_institution_admin(instituicao_id) OR is_institution_teacher(instituicao_id));
CREATE POLICY "notif_update" ON public.notificacoes FOR UPDATE TO authenticated
  USING (destinatario_id = auth.uid()) WITH CHECK (destinatario_id = auth.uid());
CREATE POLICY "notif_delete" ON public.notificacoes FOR DELETE TO authenticated USING (destinatario_id = auth.uid());

-- comunicados
DROP POLICY IF EXISTS "comun_select" ON public.comunicados; DROP POLICY IF EXISTS "comun_write" ON public.comunicados;
CREATE POLICY "comun_select" ON public.comunicados FOR SELECT TO authenticated USING (is_institution_member(instituicao_id));
CREATE POLICY "comun_write"  ON public.comunicados FOR ALL    TO authenticated USING (remetente_id = auth.uid() OR is_institution_admin(instituicao_id));

-- eventos
DROP POLICY IF EXISTS "evts_select" ON public.eventos; DROP POLICY IF EXISTS "evts_write" ON public.eventos;
CREATE POLICY "evts_select" ON public.eventos FOR SELECT TO authenticated USING (is_institution_member(instituicao_id));
CREATE POLICY "evts_write"  ON public.eventos FOR ALL    TO authenticated USING (is_institution_admin(instituicao_id));

-- logs
DROP POLICY IF EXISTS "logs_select" ON public.logs_auditoria; DROP POLICY IF EXISTS "logs_insert" ON public.logs_auditoria;
CREATE POLICY "logs_select" ON public.logs_auditoria FOR SELECT TO authenticated USING (is_institution_admin(instituicao_id));
CREATE POLICY "logs_insert" ON public.logs_auditoria FOR INSERT TO authenticated WITH CHECK (true);

-- ============================================================
-- PARTE 8: Permissões iniciais (ON CONFLICT DO NOTHING)
-- ============================================================
INSERT INTO public.permissoes_perfil (perfil, recurso, acao, escopo) VALUES
('super_admin','institutions','manage','all'),('super_admin','users','manage','all'),
('super_admin','roles','manage','all'),('super_admin','audit_logs','read','all'),
('super_admin','communications','manage','all'),('super_admin','events','manage','all'),
('super_admin','settings','manage','all'),
('admin','institutions','read','institution'),('admin','institutions','update','institution'),
('admin','users','manage','institution'),('admin','courses','manage','institution'),
('admin','classes','manage','institution'),('admin','subjects','manage','institution'),
('admin','academic_periods','manage','institution'),('admin','communications','manage','institution'),
('admin','events','manage','institution'),('admin','audit_logs','read','institution'),
('admin','reports','read','institution'),('admin','grades','manage','institution'),
('admin','attendance','manage','institution'),('admin','occurrences','manage','institution'),
('admin','notifications','manage','institution'),('admin','settings','manage','institution'),
('coordenador','courses','read','institution'),('coordenador','classes','manage','institution'),
('coordenador','subjects','read','institution'),('coordenador','teachers','manage','institution'),
('coordenador','students','manage','institution'),('coordenador','enrollments','manage','institution'),
('coordenador','reports','read','institution'),('coordenador','occurrences','read','institution'),
('coordenador','communications','create','institution'),('coordenador','events','read','institution'),
('professor','classes','read','institution'),('professor','subjects','read','institution'),
('professor','class_subjects','read','own'),('professor','assessments','manage','own'),
('professor','grades','manage','own'),('professor','attendance','manage','own'),
('professor','occurrences','create','own'),('professor','occurrences','update','own'),
('professor','communications','read','institution'),('professor','notifications','read','own'),
('professor','events','read','institution'),
('aluno','classes','read','own'),('aluno','grades','read','own'),
('aluno','attendance','read','own'),('aluno','occurrences','read','own'),
('aluno','communications','read','institution'),('aluno','notifications','read','own'),
('aluno','events','read','institution'),
('responsavel','students','read','own'),('responsavel','grades','read','own'),
('responsavel','attendance','read','own'),('responsavel','occurrences','read','own'),
('responsavel','communications','read','institution'),('responsavel','notifications','read','own'),
('responsavel','events','read','institution')
ON CONFLICT (perfil, recurso, acao) DO NOTHING;

-- ============================================================
-- PARTE 9: Trigger para criar perfil/settings automaticamente
-- ============================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  INSERT INTO public.perfis (id, nome_completo) VALUES (NEW.id, '')
    ON CONFLICT (id) DO NOTHING;
  INSERT INTO public.configuracoes_usuario (usuario_id) VALUES (NEW.id)
    ON CONFLICT (usuario_id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
