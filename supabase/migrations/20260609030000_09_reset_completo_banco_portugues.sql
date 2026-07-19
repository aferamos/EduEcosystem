/*
================================================================================
  EduOne – Reset Completo + Schema em Português
  
  ATENÇÃO: Este script APAGA todas as tabelas existentes e recria o banco
  do zero, alinhado 100% com o app.
  
  Execute no SQL Editor do Supabase.
================================================================================
*/

-- ============================================================
-- PARTE 1: LIMPEZA TOTAL (drop na ordem correta para evitar FK)
-- ============================================================

DROP TABLE IF EXISTS public.audit_logs            CASCADE;
DROP TABLE IF EXISTS public.logs_auditoria        CASCADE;
DROP TABLE IF EXISTS public.occurrences           CASCADE;
DROP TABLE IF EXISTS public.ocorrencias           CASCADE;
DROP TABLE IF EXISTS public.grades                CASCADE;
DROP TABLE IF EXISTS public.notas                 CASCADE;
DROP TABLE IF EXISTS public.assessments           CASCADE;
DROP TABLE IF EXISTS public.avaliacoes            CASCADE;
DROP TABLE IF EXISTS public.attendance            CASCADE;
DROP TABLE IF EXISTS public.frequencias           CASCADE;
DROP TABLE IF EXISTS public.student_enrollments   CASCADE;
DROP TABLE IF EXISTS public.matriculas            CASCADE;
DROP TABLE IF EXISTS public.class_subjects        CASCADE;
DROP TABLE IF EXISTS public.turma_disciplinas     CASCADE;
DROP TABLE IF EXISTS public.subjects              CASCADE;
DROP TABLE IF EXISTS public.disciplinas           CASCADE;
DROP TABLE IF EXISTS public.classes               CASCADE;
DROP TABLE IF EXISTS public.turmas                CASCADE;
DROP TABLE IF EXISTS public.courses               CASCADE;
DROP TABLE IF EXISTS public.cursos                CASCADE;
DROP TABLE IF EXISTS public.academic_periods      CASCADE;
DROP TABLE IF EXISTS public.periodos_letivos      CASCADE;
DROP TABLE IF EXISTS public.events                CASCADE;
DROP TABLE IF EXISTS public.eventos               CASCADE;
DROP TABLE IF EXISTS public.communications        CASCADE;
DROP TABLE IF EXISTS public.comunicados           CASCADE;
DROP TABLE IF EXISTS public.notifications         CASCADE;
DROP TABLE IF EXISTS public.notificacoes          CASCADE;
DROP TABLE IF EXISTS public.role_permissions      CASCADE;
DROP TABLE IF EXISTS public.permissoes_perfil     CASCADE;
DROP TABLE IF EXISTS public.user_active_context   CASCADE;
DROP TABLE IF EXISTS public.contexto_ativo        CASCADE;
DROP TABLE IF EXISTS public.user_settings         CASCADE;
DROP TABLE IF EXISTS public.configuracoes_usuario CASCADE;
DROP TABLE IF EXISTS public.user_mfa              CASCADE;
DROP TABLE IF EXISTS public.mfa_usuario           CASCADE;
DROP TABLE IF EXISTS public.user_sessions         CASCADE;
DROP TABLE IF EXISTS public.sessoes_usuario       CASCADE;
DROP TABLE IF EXISTS public.user_roles            CASCADE;
DROP TABLE IF EXISTS public.perfis_usuario        CASCADE;
DROP TABLE IF EXISTS public.profiles              CASCADE;
DROP TABLE IF EXISTS public.perfis               CASCADE;
DROP TABLE IF EXISTS public.institutions          CASCADE;
DROP TABLE IF EXISTS public.instituicoes          CASCADE;
-- tabelas extras que existiam no banco antigo
DROP TABLE IF EXISTS public.council_votes         CASCADE;
DROP TABLE IF EXISTS public.council_documents     CASCADE;
DROP TABLE IF EXISTS public.council_participants  CASCADE;
DROP TABLE IF EXISTS public.council_decisions     CASCADE;
DROP TABLE IF EXISTS public.councils              CASCADE;
DROP TABLE IF EXISTS public.conversation_participants CASCADE;
DROP TABLE IF EXISTS public.messages              CASCADE;
DROP TABLE IF EXISTS public.conversations         CASCADE;
DROP TABLE IF EXISTS public.files                 CASCADE;
DROP TABLE IF EXISTS public.historical_grades     CASCADE;
DROP TABLE IF EXISTS public.historical_enrollments CASCADE;
DROP TABLE IF EXISTS public.historical_occurrences CASCADE;
DROP TABLE IF EXISTS public.institution_settings  CASCADE;
DROP TABLE IF EXISTS public.grade_levels          CASCADE;
DROP TABLE IF EXISTS public.school_years          CASCADE;
DROP TABLE IF EXISTS public.student_guardians     CASCADE;
DROP TABLE IF EXISTS public.teacher_assignments   CASCADE;
DROP TABLE IF EXISTS public.guardians             CASCADE;
DROP TABLE IF EXISTS public.students              CASCADE;
DROP TABLE IF EXISTS public.teachers              CASCADE;
DROP TABLE IF EXISTS public.enrollments           CASCADE;
DROP TABLE IF EXISTS public.roles                 CASCADE;
DROP TABLE IF EXISTS public.permissions           CASCADE;

-- Drop views antigas
DROP VIEW IF EXISTS public.v_class_enrollments         CASCADE;
DROP VIEW IF EXISTS public.v_council_summary           CASCADE;
DROP VIEW IF EXISTS public.v_notifications_unread_count CASCADE;
DROP VIEW IF EXISTS public.v_open_occurrences          CASCADE;
DROP VIEW IF EXISTS public.v_student_attendance_summary CASCADE;
DROP VIEW IF EXISTS public.v_student_grades_summary    CASCADE;
DROP VIEW IF EXISTS public.v_student_guardians_full    CASCADE;
DROP VIEW IF EXISTS public.v_students_full             CASCADE;
DROP VIEW IF EXISTS public.v_teacher_assignments_full  CASCADE;

-- Drop funções auxiliares antigas
DROP FUNCTION IF EXISTS public.get_user_institution_ids()       CASCADE;
DROP FUNCTION IF EXISTS public.is_institution_admin(uuid)       CASCADE;
DROP FUNCTION IF EXISTS public.is_institution_teacher(uuid)     CASCADE;
DROP FUNCTION IF EXISTS public.is_institution_member(uuid)      CASCADE;
DROP FUNCTION IF EXISTS public.handle_new_user()                CASCADE;

-- ============================================================
-- PARTE 2: TABELAS EM PORTUGUÊS
-- (nomes em pt-BR, colunas em pt-BR onde faz sentido,
--  mas mantendo compatibilidade com o app via views/aliases)
-- ============================================================

-- ------------------------------------------------------------
-- instituicoes  (app: institutions)
-- ------------------------------------------------------------
CREATE TABLE public.instituicoes (
  id               uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  nome             text        NOT NULL,
  slug             text        UNIQUE NOT NULL,
  logo_url         text,
  cor_primaria     text        NOT NULL DEFAULT '#1A56DB',
  cor_secundaria   text        NOT NULL DEFAULT '#0694A2',
  endereco         text,
  cidade           text,
  telefone         text,
  email            text,
  ativo            boolean     NOT NULL DEFAULT true,
  criado_em        timestamptz NOT NULL DEFAULT now(),
  atualizado_em    timestamptz NOT NULL DEFAULT now()
);

-- ------------------------------------------------------------
-- perfis  (app: profiles)
-- ------------------------------------------------------------
CREATE TABLE public.perfis (
  id               uuid        PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  nome_completo    text        NOT NULL DEFAULT '',
  avatar_url       text,
  telefone         text,
  data_nascimento  date,
  criado_em        timestamptz NOT NULL DEFAULT now(),
  atualizado_em    timestamptz NOT NULL DEFAULT now()
);

-- ------------------------------------------------------------
-- perfis_usuario  (app: user_roles)
-- ------------------------------------------------------------
CREATE TABLE public.perfis_usuario (
  id               uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_id       uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  instituicao_id   uuid        NOT NULL REFERENCES public.instituicoes(id) ON DELETE CASCADE,
  perfil           text        NOT NULL CHECK (perfil IN ('super_admin','admin','coordenador','professor','aluno','responsavel')),
  ativo            boolean     NOT NULL DEFAULT true,
  criado_em        timestamptz NOT NULL DEFAULT now(),
  UNIQUE(usuario_id, instituicao_id, perfil)
);

-- ------------------------------------------------------------
-- sessoes_usuario  (app: user_sessions)
-- ------------------------------------------------------------
CREATE TABLE public.sessoes_usuario (
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

-- ------------------------------------------------------------
-- configuracoes_usuario  (app: user_settings)
-- ------------------------------------------------------------
CREATE TABLE public.configuracoes_usuario (
  id                     uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_id             uuid        NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  notif_email            boolean     NOT NULL DEFAULT true,
  notif_push             boolean     NOT NULL DEFAULT true,
  notif_sms              boolean     NOT NULL DEFAULT false,
  idioma                 text        NOT NULL DEFAULT 'pt-BR',
  tema                   text        NOT NULL DEFAULT 'light' CHECK (tema IN ('light','dark','system')),
  fuso_horario           text        NOT NULL DEFAULT 'America/Sao_Paulo',
  login_biometrico       boolean     NOT NULL DEFAULT false,
  atualizado_em          timestamptz NOT NULL DEFAULT now()
);

-- ------------------------------------------------------------
-- contexto_ativo  (app: user_active_context)
-- ------------------------------------------------------------
CREATE TABLE public.contexto_ativo (
  usuario_id       uuid        PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  instituicao_id   uuid        REFERENCES public.instituicoes(id) ON DELETE SET NULL,
  perfil           text        CHECK (perfil IN ('super_admin','admin','coordenador','professor','aluno','responsavel')),
  perfil_id        uuid        REFERENCES public.perfis(id) ON DELETE SET NULL,
  atualizado_em    timestamptz NOT NULL DEFAULT now()
);

-- ------------------------------------------------------------
-- permissoes_perfil  (app: role_permissions)
-- ------------------------------------------------------------
CREATE TABLE public.permissoes_perfil (
  id               uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  perfil           text        NOT NULL CHECK (perfil IN ('super_admin','admin','coordenador','professor','aluno','responsavel')),
  recurso          text        NOT NULL,
  acao             text        NOT NULL CHECK (acao IN ('read','create','update','delete','manage','export')),
  escopo           text        NOT NULL DEFAULT 'own' CHECK (escopo IN ('own','institution','all')),
  criado_em        timestamptz NOT NULL DEFAULT now(),
  UNIQUE(perfil, recurso, acao)
);

-- ------------------------------------------------------------
-- periodos_letivos  (app: academic_periods)
-- ------------------------------------------------------------
CREATE TABLE public.periodos_letivos (
  id               uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  instituicao_id   uuid        NOT NULL REFERENCES public.instituicoes(id) ON DELETE CASCADE,
  nome             text        NOT NULL,
  tipo             text        NOT NULL CHECK (tipo IN ('bimestre','trimestre','semestre','anual')),
  data_inicio      date        NOT NULL,
  data_fim         date        NOT NULL,
  ano              integer     NOT NULL,
  ativo            boolean     NOT NULL DEFAULT true,
  criado_em        timestamptz NOT NULL DEFAULT now()
);

-- ------------------------------------------------------------
-- cursos  (app: courses)
-- ------------------------------------------------------------
CREATE TABLE public.cursos (
  id               uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  instituicao_id   uuid        NOT NULL REFERENCES public.instituicoes(id) ON DELETE CASCADE,
  nome             text        NOT NULL,
  nivel            text        NOT NULL DEFAULT 'fundamental',
  duracao_anos     integer     NOT NULL DEFAULT 1,
  ativo            boolean     NOT NULL DEFAULT true,
  criado_em        timestamptz NOT NULL DEFAULT now()
);

-- ------------------------------------------------------------
-- turmas  (app: classes)
-- ------------------------------------------------------------
CREATE TABLE public.turmas (
  id               uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  instituicao_id   uuid        NOT NULL REFERENCES public.instituicoes(id) ON DELETE CASCADE,
  curso_id         uuid        REFERENCES public.cursos(id) ON DELETE SET NULL,
  nome             text        NOT NULL,
  ano              integer     NOT NULL,
  turno            text        CHECK (turno IN ('manha','tarde','noite','integral')),
  max_alunos       integer     NOT NULL DEFAULT 40,
  ativo            boolean     NOT NULL DEFAULT true,
  criado_em        timestamptz NOT NULL DEFAULT now()
);

-- ------------------------------------------------------------
-- disciplinas  (app: subjects)
-- ------------------------------------------------------------
CREATE TABLE public.disciplinas (
  id               uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  instituicao_id   uuid        NOT NULL REFERENCES public.instituicoes(id) ON DELETE CASCADE,
  nome             text        NOT NULL,
  codigo           text,
  carga_horaria    integer,
  ativo            boolean     NOT NULL DEFAULT true,
  criado_em        timestamptz NOT NULL DEFAULT now()
);

-- ------------------------------------------------------------
-- turma_disciplinas  (app: class_subjects)
-- ------------------------------------------------------------
CREATE TABLE public.turma_disciplinas (
  id               uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  turma_id         uuid        NOT NULL REFERENCES public.turmas(id) ON DELETE CASCADE,
  disciplina_id    uuid        NOT NULL REFERENCES public.disciplinas(id) ON DELETE CASCADE,
  professor_id     uuid        REFERENCES auth.users(id) ON DELETE SET NULL,
  horas_semanais   integer     NOT NULL DEFAULT 2,
  criado_em        timestamptz NOT NULL DEFAULT now(),
  UNIQUE(turma_id, disciplina_id)
);

-- ------------------------------------------------------------
-- matriculas  (app: student_enrollments)
-- ------------------------------------------------------------
CREATE TABLE public.matriculas (
  id               uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  aluno_id         uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  turma_id         uuid        NOT NULL REFERENCES public.turmas(id) ON DELETE CASCADE,
  instituicao_id   uuid        NOT NULL REFERENCES public.instituicoes(id) ON DELETE CASCADE,
  numero_matricula text,
  data_matricula   date        NOT NULL DEFAULT CURRENT_DATE,
  situacao         text        NOT NULL DEFAULT 'ativo' CHECK (situacao IN ('ativo','transferido','concluido','cancelado')),
  criado_em        timestamptz NOT NULL DEFAULT now(),
  UNIQUE(aluno_id, turma_id)
);

-- ------------------------------------------------------------
-- frequencias  (app: attendance)
-- ------------------------------------------------------------
CREATE TABLE public.frequencias (
  id                   uuid    PRIMARY KEY DEFAULT gen_random_uuid(),
  turma_disciplina_id  uuid    NOT NULL REFERENCES public.turma_disciplinas(id) ON DELETE CASCADE,
  aluno_id             uuid    NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  data                 date    NOT NULL,
  situacao             text    NOT NULL CHECK (situacao IN ('presente','falta','justificado','atraso')),
  observacao           text,
  registrado_por       uuid    REFERENCES auth.users(id),
  criado_em            timestamptz NOT NULL DEFAULT now(),
  UNIQUE(turma_disciplina_id, aluno_id, data)
);

-- ------------------------------------------------------------
-- avaliacoes  (app: assessments)
-- ------------------------------------------------------------
CREATE TABLE public.avaliacoes (
  id                   uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  turma_disciplina_id  uuid        NOT NULL REFERENCES public.turma_disciplinas(id) ON DELETE CASCADE,
  periodo_letivo_id    uuid        REFERENCES public.periodos_letivos(id) ON DELETE SET NULL,
  titulo               text        NOT NULL,
  tipo                 text        NOT NULL CHECK (tipo IN ('prova','teste','trabalho','projeto','quiz','recuperacao')),
  data                 date,
  nota_maxima          numeric(5,2) NOT NULL DEFAULT 10,
  peso                 numeric(3,2) NOT NULL DEFAULT 1,
  criado_em            timestamptz NOT NULL DEFAULT now()
);

-- ------------------------------------------------------------
-- notas  (app: grades)
-- ------------------------------------------------------------
CREATE TABLE public.notas (
  id               uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  avaliacao_id     uuid        NOT NULL REFERENCES public.avaliacoes(id) ON DELETE CASCADE,
  aluno_id         uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  nota             numeric(5,2),
  situacao         text        NOT NULL DEFAULT 'pendente' CHECK (situacao IN ('pendente','lancada','falta','dispensado')),
  observacao       text,
  lancado_por      uuid        REFERENCES auth.users(id),
  lancado_em       timestamptz,
  criado_em        timestamptz NOT NULL DEFAULT now(),
  UNIQUE(avaliacao_id, aluno_id)
);

-- ------------------------------------------------------------
-- ocorrencias  (app: occurrences)
-- ------------------------------------------------------------
CREATE TABLE public.ocorrencias (
  id               uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  instituicao_id   uuid        NOT NULL REFERENCES public.instituicoes(id) ON DELETE CASCADE,
  aluno_id         uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  registrado_por   uuid        NOT NULL REFERENCES auth.users(id),
  turma_id         uuid        REFERENCES public.turmas(id) ON DELETE SET NULL,
  tipo             text        NOT NULL CHECK (tipo IN ('disciplinar','academico','comportamental','elogio','observacao')),
  titulo           text        NOT NULL,
  descricao        text,
  gravidade        text        CHECK (gravidade IN ('baixa','media','alta')),
  situacao         text        NOT NULL DEFAULT 'aberta' CHECK (situacao IN ('aberta','em_andamento','resolvida','encerrada')),
  criado_em        timestamptz NOT NULL DEFAULT now(),
  atualizado_em    timestamptz NOT NULL DEFAULT now()
);

-- ------------------------------------------------------------
-- notificacoes  (app: notifications)
-- ------------------------------------------------------------
CREATE TABLE public.notificacoes (
  id               uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  instituicao_id   uuid        NOT NULL REFERENCES public.instituicoes(id) ON DELETE CASCADE,
  destinatario_id  uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  remetente_id     uuid        REFERENCES auth.users(id),
  titulo           text        NOT NULL,
  mensagem         text        NOT NULL,
  tipo             text        NOT NULL DEFAULT 'info' CHECK (tipo IN ('info','alerta','sucesso','urgente','nota','frequencia','ocorrencia')),
  lida             boolean     NOT NULL DEFAULT false,
  dados            jsonb,
  criado_em        timestamptz NOT NULL DEFAULT now()
);

-- ------------------------------------------------------------
-- comunicados  (app: communications)
-- ------------------------------------------------------------
CREATE TABLE public.comunicados (
  id               uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  instituicao_id   uuid        NOT NULL REFERENCES public.instituicoes(id) ON DELETE CASCADE,
  remetente_id     uuid        NOT NULL REFERENCES auth.users(id),
  titulo           text        NOT NULL,
  mensagem         text        NOT NULL,
  publico          text[]      NOT NULL DEFAULT '{}',
  turmas_ids       uuid[]      NOT NULL DEFAULT '{}',
  fixado           boolean     NOT NULL DEFAULT false,
  publicado_em     timestamptz NOT NULL DEFAULT now(),
  criado_em        timestamptz NOT NULL DEFAULT now()
);

-- ------------------------------------------------------------
-- eventos  (app: events)
-- ------------------------------------------------------------
CREATE TABLE public.eventos (
  id               uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  instituicao_id   uuid        NOT NULL REFERENCES public.instituicoes(id) ON DELETE CASCADE,
  titulo           text        NOT NULL,
  descricao        text,
  data_evento      date        NOT NULL,
  data_fim         date,
  tipo             text        NOT NULL DEFAULT 'geral' CHECK (tipo IN ('feriado','avaliacao','reuniao','atividade','geral')),
  turmas_ids       uuid[]      NOT NULL DEFAULT '{}',
  criado_por       uuid        REFERENCES auth.users(id),
  criado_em        timestamptz NOT NULL DEFAULT now()
);

-- ------------------------------------------------------------
-- logs_auditoria  (app: audit_logs)
-- ------------------------------------------------------------
CREATE TABLE public.logs_auditoria (
  id               uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  instituicao_id   uuid        REFERENCES public.instituicoes(id) ON DELETE SET NULL,
  usuario_id       uuid        REFERENCES auth.users(id) ON DELETE SET NULL,
  acao             text        NOT NULL,
  tipo_recurso     text        NOT NULL,
  recurso_id       uuid,
  dados_anteriores jsonb,
  dados_novos      jsonb,
  ip               text,
  criado_em        timestamptz NOT NULL DEFAULT now()
);

-- ============================================================
-- PARTE 3: ÍNDICES
-- ============================================================
CREATE INDEX idx_perfis_usuario_usuario    ON public.perfis_usuario(usuario_id);
CREATE INDEX idx_perfis_usuario_inst       ON public.perfis_usuario(instituicao_id);
CREATE INDEX idx_matriculas_aluno          ON public.matriculas(aluno_id);
CREATE INDEX idx_matriculas_turma          ON public.matriculas(turma_id);
CREATE INDEX idx_frequencias_td            ON public.frequencias(turma_disciplina_id);
CREATE INDEX idx_frequencias_aluno         ON public.frequencias(aluno_id);
CREATE INDEX idx_frequencias_data          ON public.frequencias(data);
CREATE INDEX idx_notas_aluno               ON public.notas(aluno_id);
CREATE INDEX idx_notas_avaliacao           ON public.notas(avaliacao_id);
CREATE INDEX idx_notificacoes_destinatario ON public.notificacoes(destinatario_id);
CREATE INDEX idx_notificacoes_lida         ON public.notificacoes(destinatario_id, lida);
CREATE INDEX idx_ocorrencias_aluno         ON public.ocorrencias(aluno_id);
CREATE INDEX idx_ocorrencias_inst          ON public.ocorrencias(instituicao_id);
CREATE INDEX idx_sessoes_usuario           ON public.sessoes_usuario(usuario_id);
CREATE INDEX idx_td_professor              ON public.turma_disciplinas(professor_id);
CREATE INDEX idx_permissoes_perfil_perfil  ON public.permissoes_perfil(perfil);
CREATE INDEX idx_logs_inst                 ON public.logs_auditoria(instituicao_id);

-- ============================================================
-- PARTE 4: VIEWS DE COMPATIBILIDADE (nomes em inglês = app)
-- ============================================================
-- O app usa nomes em inglês nas queries; as views traduzem para pt-BR.

CREATE OR REPLACE VIEW public.institutions AS
  SELECT
    id,
    nome          AS name,
    slug,
    logo_url,
    cor_primaria  AS primary_color,
    cor_secundaria AS secondary_color,
    endereco      AS address,
    cidade        AS city,
    telefone      AS phone,
    email,
    ativo         AS active,
    criado_em     AS created_at,
    atualizado_em AS updated_at
  FROM public.instituicoes;

CREATE OR REPLACE VIEW public.profiles AS
  SELECT
    id,
    nome_completo   AS full_name,
    avatar_url,
    telefone        AS phone,
    data_nascimento AS birth_date,
    criado_em       AS created_at,
    atualizado_em   AS updated_at
  FROM public.perfis;

CREATE OR REPLACE VIEW public.user_roles AS
  SELECT
    id,
    usuario_id    AS user_id,
    instituicao_id AS institution_id,
    perfil        AS role,
    ativo         AS is_active,
    criado_em     AS created_at
  FROM public.perfis_usuario;

CREATE OR REPLACE VIEW public.user_sessions AS
  SELECT
    id,
    usuario_id       AS user_id,
    nome_dispositivo AS device_name,
    tipo_dispositivo AS device_type,
    sistema          AS os,
    ip               AS ip_address,
    ultimo_acesso    AS last_active_at,
    criado_em        AS created_at,
    expira_em        AS expires_at
  FROM public.sessoes_usuario;

CREATE OR REPLACE VIEW public.user_settings AS
  SELECT
    id,
    usuario_id   AS user_id,
    notif_email  AS email_notifications,
    notif_push   AS push_notifications,
    notif_sms    AS sms_notifications,
    idioma       AS language,
    tema         AS theme,
    fuso_horario AS timezone,
    login_biometrico AS biometric_login,
    atualizado_em AS updated_at
  FROM public.configuracoes_usuario;

CREATE OR REPLACE VIEW public.user_active_context AS
  SELECT
    usuario_id     AS user_id,
    instituicao_id AS institution_id,
    perfil         AS role,
    perfil_id      AS profile_id,
    atualizado_em  AS updated_at
  FROM public.contexto_ativo;

CREATE OR REPLACE VIEW public.role_permissions AS
  SELECT
    id,
    perfil    AS role,
    recurso   AS resource,
    acao      AS action,
    escopo    AS scope,
    criado_em AS created_at
  FROM public.permissoes_perfil;

CREATE OR REPLACE VIEW public.academic_periods AS
  SELECT
    id,
    instituicao_id AS institution_id,
    nome           AS name,
    tipo           AS type,
    data_inicio    AS start_date,
    data_fim       AS end_date,
    ano            AS year,
    ativo          AS active,
    criado_em      AS created_at
  FROM public.periodos_letivos;

CREATE OR REPLACE VIEW public.courses AS
  SELECT
    id,
    instituicao_id AS institution_id,
    nome           AS name,
    nivel          AS level,
    duracao_anos   AS duration_years,
    ativo          AS active,
    criado_em      AS created_at
  FROM public.cursos;

CREATE OR REPLACE VIEW public.classes AS
  SELECT
    id,
    instituicao_id AS institution_id,
    curso_id       AS course_id,
    nome           AS name,
    ano            AS year,
    turno          AS shift,
    max_alunos     AS max_students,
    ativo          AS active,
    criado_em      AS created_at
  FROM public.turmas;

CREATE OR REPLACE VIEW public.subjects AS
  SELECT
    id,
    instituicao_id AS institution_id,
    nome           AS name,
    codigo         AS code,
    carga_horaria  AS workload_hours,
    ativo          AS active,
    criado_em      AS created_at
  FROM public.disciplinas;

CREATE OR REPLACE VIEW public.class_subjects AS
  SELECT
    id,
    turma_id       AS class_id,
    disciplina_id  AS subject_id,
    professor_id   AS teacher_id,
    horas_semanais AS weekly_hours,
    criado_em      AS created_at
  FROM public.turma_disciplinas;

CREATE OR REPLACE VIEW public.student_enrollments AS
  SELECT
    id,
    aluno_id         AS student_id,
    turma_id         AS class_id,
    instituicao_id   AS institution_id,
    numero_matricula AS enrollment_number,
    data_matricula   AS enrollment_date,
    situacao         AS status,
    criado_em        AS created_at
  FROM public.matriculas;

CREATE OR REPLACE VIEW public.attendance AS
  SELECT
    id,
    turma_disciplina_id AS class_subject_id,
    aluno_id            AS student_id,
    data                AS date,
    situacao            AS status,
    observacao          AS note,
    registrado_por      AS recorded_by,
    criado_em           AS created_at
  FROM public.frequencias;

CREATE OR REPLACE VIEW public.assessments AS
  SELECT
    id,
    turma_disciplina_id AS class_subject_id,
    periodo_letivo_id   AS academic_period_id,
    titulo              AS title,
    tipo                AS type,
    data                AS date,
    nota_maxima         AS max_score,
    peso                AS weight,
    criado_em           AS created_at
  FROM public.avaliacoes;

CREATE OR REPLACE VIEW public.grades AS
  SELECT
    id,
    avaliacao_id AS assessment_id,
    aluno_id     AS student_id,
    nota         AS score,
    situacao     AS status,
    observacao   AS note,
    lancado_por  AS graded_by,
    lancado_em   AS graded_at,
    criado_em    AS created_at
  FROM public.notas;

CREATE OR REPLACE VIEW public.occurrences AS
  SELECT
    id,
    instituicao_id AS institution_id,
    aluno_id       AS student_id,
    registrado_por AS reported_by,
    turma_id       AS class_id,
    tipo           AS type,
    titulo         AS title,
    descricao      AS description,
    gravidade      AS severity,
    situacao       AS status,
    criado_em      AS created_at,
    atualizado_em  AS updated_at
  FROM public.ocorrencias;

CREATE OR REPLACE VIEW public.notifications AS
  SELECT
    id,
    instituicao_id  AS institution_id,
    destinatario_id AS recipient_id,
    remetente_id    AS sender_id,
    titulo          AS title,
    mensagem        AS message,
    tipo            AS type,
    lida            AS read,
    dados           AS data,
    criado_em       AS created_at
  FROM public.notificacoes;

CREATE OR REPLACE VIEW public.communications AS
  SELECT
    id,
    instituicao_id AS institution_id,
    remetente_id   AS sender_id,
    titulo         AS title,
    mensagem       AS message,
    publico        AS audience,
    turmas_ids     AS class_ids,
    fixado         AS pinned,
    publicado_em   AS published_at,
    criado_em      AS created_at
  FROM public.comunicados;

CREATE OR REPLACE VIEW public.events AS
  SELECT
    id,
    instituicao_id AS institution_id,
    titulo         AS title,
    descricao      AS description,
    data_evento    AS event_date,
    data_fim       AS end_date,
    tipo           AS type,
    turmas_ids     AS class_ids,
    criado_por     AS created_by,
    criado_em      AS created_at
  FROM public.eventos;

CREATE OR REPLACE VIEW public.audit_logs AS
  SELECT
    id,
    instituicao_id   AS institution_id,
    usuario_id       AS user_id,
    acao             AS action,
    tipo_recurso     AS resource_type,
    recurso_id       AS resource_id,
    dados_anteriores AS old_data,
    dados_novos      AS new_data,
    ip               AS ip_address,
    criado_em        AS created_at
  FROM public.logs_auditoria;

-- ============================================================
-- PARTE 5: RLS (Row Level Security)
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
-- PARTE 6: FUNÇÕES HELPER (SECURITY DEFINER)
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
-- PARTE 7: POLÍTICAS RLS
-- ============================================================

-- instituicoes
CREATE POLICY "inst_select" ON public.instituicoes FOR SELECT TO authenticated
  USING (id = ANY(get_user_institution_ids()));
CREATE POLICY "inst_insert_auth" ON public.instituicoes FOR INSERT TO authenticated
  WITH CHECK (true);
CREATE POLICY "inst_insert_anon" ON public.instituicoes FOR INSERT TO anon
  WITH CHECK (true);
CREATE POLICY "inst_update" ON public.instituicoes FOR UPDATE TO authenticated
  USING (is_institution_admin(id)) WITH CHECK (is_institution_admin(id));

-- perfis
CREATE POLICY "perfis_select" ON public.perfis FOR SELECT TO authenticated USING (true);
CREATE POLICY "perfis_insert_auth" ON public.perfis FOR INSERT TO authenticated
  WITH CHECK (id = auth.uid());
CREATE POLICY "perfis_insert_anon" ON public.perfis FOR INSERT TO anon
  WITH CHECK (true);
CREATE POLICY "perfis_update" ON public.perfis FOR UPDATE TO authenticated
  USING (id = auth.uid()) WITH CHECK (id = auth.uid());

-- perfis_usuario
CREATE POLICY "pu_select" ON public.perfis_usuario FOR SELECT TO authenticated
  USING (usuario_id = auth.uid() OR is_institution_admin(instituicao_id));
CREATE POLICY "pu_insert_auth" ON public.perfis_usuario FOR INSERT TO authenticated
  WITH CHECK (is_institution_admin(instituicao_id) OR usuario_id = auth.uid());
CREATE POLICY "pu_insert_anon" ON public.perfis_usuario FOR INSERT TO anon
  WITH CHECK (true);
CREATE POLICY "pu_update" ON public.perfis_usuario FOR UPDATE TO authenticated
  USING (is_institution_admin(instituicao_id)) WITH CHECK (is_institution_admin(instituicao_id));
CREATE POLICY "pu_delete" ON public.perfis_usuario FOR DELETE TO authenticated
  USING (is_institution_admin(instituicao_id));

-- sessoes_usuario
CREATE POLICY "su_select" ON public.sessoes_usuario FOR SELECT TO authenticated USING (usuario_id = auth.uid());
CREATE POLICY "su_insert" ON public.sessoes_usuario FOR INSERT TO authenticated WITH CHECK (usuario_id = auth.uid());
CREATE POLICY "su_update" ON public.sessoes_usuario FOR UPDATE TO authenticated USING (usuario_id = auth.uid());
CREATE POLICY "su_delete" ON public.sessoes_usuario FOR DELETE TO authenticated USING (usuario_id = auth.uid());

-- configuracoes_usuario
CREATE POLICY "cu_select" ON public.configuracoes_usuario FOR SELECT TO authenticated USING (usuario_id = auth.uid());
CREATE POLICY "cu_insert_auth" ON public.configuracoes_usuario FOR INSERT TO authenticated WITH CHECK (usuario_id = auth.uid());
CREATE POLICY "cu_insert_anon" ON public.configuracoes_usuario FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "cu_update" ON public.configuracoes_usuario FOR UPDATE TO authenticated USING (usuario_id = auth.uid());

-- contexto_ativo
CREATE POLICY "ca_select" ON public.contexto_ativo FOR SELECT TO authenticated USING (usuario_id = auth.uid());
CREATE POLICY "ca_insert_auth" ON public.contexto_ativo FOR INSERT TO authenticated WITH CHECK (usuario_id = auth.uid());
CREATE POLICY "ca_insert_anon" ON public.contexto_ativo FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "ca_update" ON public.contexto_ativo FOR UPDATE TO authenticated USING (usuario_id = auth.uid());

-- permissoes_perfil (leitura pública para autenticados)
CREATE POLICY "pp_select" ON public.permissoes_perfil FOR SELECT TO authenticated USING (true);

-- cursos, turmas, disciplinas, periodos_letivos
CREATE POLICY "cursos_select" ON public.cursos FOR SELECT TO authenticated USING (is_institution_member(instituicao_id));
CREATE POLICY "cursos_write"  ON public.cursos FOR ALL    TO authenticated USING (is_institution_admin(instituicao_id));
CREATE POLICY "turmas_select" ON public.turmas FOR SELECT TO authenticated USING (is_institution_member(instituicao_id));
CREATE POLICY "turmas_write"  ON public.turmas FOR ALL    TO authenticated USING (is_institution_admin(instituicao_id));
CREATE POLICY "disc_select"   ON public.disciplinas FOR SELECT TO authenticated USING (is_institution_member(instituicao_id));
CREATE POLICY "disc_write"    ON public.disciplinas FOR ALL    TO authenticated USING (is_institution_admin(instituicao_id));
CREATE POLICY "pl_select"     ON public.periodos_letivos FOR SELECT TO authenticated USING (is_institution_member(instituicao_id));
CREATE POLICY "pl_write"      ON public.periodos_letivos FOR ALL    TO authenticated USING (is_institution_admin(instituicao_id));

-- turma_disciplinas
CREATE POLICY "td_select" ON public.turma_disciplinas FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.turmas t WHERE t.id = turma_id AND is_institution_member(t.instituicao_id)));
CREATE POLICY "td_write"  ON public.turma_disciplinas FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.turmas t WHERE t.id = turma_id AND is_institution_admin(t.instituicao_id)));

-- matriculas
CREATE POLICY "mat_select" ON public.matriculas FOR SELECT TO authenticated
  USING (aluno_id = auth.uid() OR is_institution_admin(instituicao_id) OR is_institution_teacher(instituicao_id));
CREATE POLICY "mat_write"  ON public.matriculas FOR ALL    TO authenticated USING (is_institution_admin(instituicao_id));

-- frequencias
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
CREATE POLICY "aval_select" ON public.avaliacoes FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.turma_disciplinas td JOIN public.turmas t ON t.id = td.turma_id
                 WHERE td.id = turma_disciplina_id AND is_institution_member(t.instituicao_id)));
CREATE POLICY "aval_write"  ON public.avaliacoes FOR ALL    TO authenticated
  USING (EXISTS (SELECT 1 FROM public.turma_disciplinas td WHERE td.id = turma_disciplina_id AND td.professor_id = auth.uid())
    OR EXISTS (SELECT 1 FROM public.turma_disciplinas td JOIN public.turmas t ON t.id = td.turma_id
               WHERE td.id = turma_disciplina_id AND is_institution_admin(t.instituicao_id)));

-- notas
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
CREATE POLICY "ocorr_select" ON public.ocorrencias FOR SELECT TO authenticated
  USING (aluno_id = auth.uid() OR registrado_por = auth.uid() OR is_institution_admin(instituicao_id) OR is_institution_teacher(instituicao_id));
CREATE POLICY "ocorr_insert" ON public.ocorrencias FOR INSERT TO authenticated
  WITH CHECK (is_institution_admin(instituicao_id) OR is_institution_teacher(instituicao_id));
CREATE POLICY "ocorr_update" ON public.ocorrencias FOR UPDATE TO authenticated
  USING (registrado_por = auth.uid() OR is_institution_admin(instituicao_id));
CREATE POLICY "ocorr_delete" ON public.ocorrencias FOR DELETE TO authenticated
  USING (is_institution_admin(instituicao_id));

-- notificacoes
CREATE POLICY "notif_select" ON public.notificacoes FOR SELECT TO authenticated USING (destinatario_id = auth.uid());
CREATE POLICY "notif_insert" ON public.notificacoes FOR INSERT TO authenticated
  WITH CHECK (is_institution_admin(instituicao_id) OR is_institution_teacher(instituicao_id));
CREATE POLICY "notif_update" ON public.notificacoes FOR UPDATE TO authenticated
  USING (destinatario_id = auth.uid()) WITH CHECK (destinatario_id = auth.uid());
CREATE POLICY "notif_delete" ON public.notificacoes FOR DELETE TO authenticated USING (destinatario_id = auth.uid());

-- comunicados
CREATE POLICY "comun_select" ON public.comunicados FOR SELECT TO authenticated USING (is_institution_member(instituicao_id));
CREATE POLICY "comun_write"  ON public.comunicados FOR ALL    TO authenticated
  USING (remetente_id = auth.uid() OR is_institution_admin(instituicao_id));

-- eventos
CREATE POLICY "evts_select" ON public.eventos FOR SELECT TO authenticated USING (is_institution_member(instituicao_id));
CREATE POLICY "evts_write"  ON public.eventos FOR ALL    TO authenticated USING (is_institution_admin(instituicao_id));

-- logs
CREATE POLICY "logs_select" ON public.logs_auditoria FOR SELECT TO authenticated USING (is_institution_admin(instituicao_id));
CREATE POLICY "logs_insert" ON public.logs_auditoria FOR INSERT TO authenticated WITH CHECK (true);

-- ============================================================
-- PARTE 8: PERMISSÕES INICIAIS
-- ============================================================
INSERT INTO public.permissoes_perfil (perfil, recurso, acao, escopo) VALUES
-- super_admin
('super_admin','institutions','manage','all'),
('super_admin','users','manage','all'),
('super_admin','roles','manage','all'),
('super_admin','audit_logs','read','all'),
('super_admin','communications','manage','all'),
('super_admin','events','manage','all'),
('super_admin','settings','manage','all'),
-- admin
('admin','institutions','read','institution'),
('admin','institutions','update','institution'),
('admin','users','manage','institution'),
('admin','courses','manage','institution'),
('admin','classes','manage','institution'),
('admin','subjects','manage','institution'),
('admin','academic_periods','manage','institution'),
('admin','communications','manage','institution'),
('admin','events','manage','institution'),
('admin','audit_logs','read','institution'),
('admin','reports','read','institution'),
('admin','grades','manage','institution'),
('admin','attendance','manage','institution'),
('admin','occurrences','manage','institution'),
('admin','notifications','manage','institution'),
('admin','settings','manage','institution'),
-- coordenador
('coordenador','courses','read','institution'),
('coordenador','classes','manage','institution'),
('coordenador','subjects','read','institution'),
('coordenador','teachers','manage','institution'),
('coordenador','students','manage','institution'),
('coordenador','enrollments','manage','institution'),
('coordenador','reports','read','institution'),
('coordenador','occurrences','read','institution'),
('coordenador','communications','create','institution'),
('coordenador','events','read','institution'),
-- professor
('professor','classes','read','institution'),
('professor','subjects','read','institution'),
('professor','class_subjects','read','own'),
('professor','assessments','manage','own'),
('professor','grades','manage','own'),
('professor','attendance','manage','own'),
('professor','occurrences','create','own'),
('professor','occurrences','update','own'),
('professor','communications','read','institution'),
('professor','notifications','read','own'),
('professor','events','read','institution'),
-- aluno
('aluno','classes','read','own'),
('aluno','grades','read','own'),
('aluno','attendance','read','own'),
('aluno','occurrences','read','own'),
('aluno','communications','read','institution'),
('aluno','notifications','read','own'),
('aluno','events','read','institution'),
-- responsavel
('responsavel','students','read','own'),
('responsavel','grades','read','own'),
('responsavel','attendance','read','own'),
('responsavel','occurrences','read','own'),
('responsavel','communications','read','institution'),
('responsavel','notifications','read','own'),
('responsavel','events','read','institution')
ON CONFLICT (perfil, recurso, acao) DO NOTHING;

-- ============================================================
-- PARTE 9: TRIGGER – criar perfil/settings ao cadastrar usuário
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
