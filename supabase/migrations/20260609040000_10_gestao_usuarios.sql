/*
================================================================================
  EduOne – Gestão Completa de Usuários
  Inclusão, Atualização e Exclusão

  Execute no SQL Editor do Supabase.

  ESTRUTURA:
    SEÇÃO 1 – Funções auxiliares de gestão
    SEÇÃO 2 – INCLUSÃO de usuários (exemplos prontos para usar)
    SEÇÃO 3 – ATUALIZAÇÃO de usuários
    SEÇÃO 4 – EXCLUSÃO de usuários
    SEÇÃO 5 – Consultas de verificação
================================================================================
*/

-- ============================================================
-- SEÇÃO 1: FUNÇÕES AUXILIARES
-- ============================================================

-- Função: criar usuário completo (perfil + configurações + papel)
-- Parâmetros:
--   p_email          → e-mail do usuário (deve já existir em auth.users)
--   p_nome_completo  → nome completo
--   p_perfil         → 'super_admin' | 'admin' | 'coordenador' | 'professor' | 'aluno' | 'responsavel'
--   p_instituicao_id → UUID da instituição (NULL para super_admin)
CREATE OR REPLACE FUNCTION public.criar_usuario_completo(
  p_usuario_id    uuid,
  p_nome_completo text,
  p_perfil        text,
  p_instituicao_id uuid DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_result jsonb;
BEGIN
  -- 1. Cria ou atualiza o perfil
  INSERT INTO public.perfis (id, nome_completo)
  VALUES (p_usuario_id, p_nome_completo)
  ON CONFLICT (id) DO UPDATE
    SET nome_completo = EXCLUDED.nome_completo,
        atualizado_em = now();

  -- 2. Cria configurações padrão se não existir
  INSERT INTO public.configuracoes_usuario (usuario_id)
  VALUES (p_usuario_id)
  ON CONFLICT (usuario_id) DO NOTHING;

  -- 3. Cria papel na instituição (se informada)
  IF p_instituicao_id IS NOT NULL THEN
    INSERT INTO public.perfis_usuario (usuario_id, instituicao_id, perfil)
    VALUES (p_usuario_id, p_instituicao_id, p_perfil)
    ON CONFLICT (usuario_id, instituicao_id, perfil) DO UPDATE
      SET ativo = true;
  END IF;

  -- 4. Define contexto ativo
  IF p_instituicao_id IS NOT NULL THEN
    INSERT INTO public.contexto_ativo (usuario_id, instituicao_id, perfil, perfil_id)
    VALUES (p_usuario_id, p_instituicao_id, p_perfil, p_usuario_id)
    ON CONFLICT (usuario_id) DO UPDATE
      SET instituicao_id = EXCLUDED.instituicao_id,
          perfil         = EXCLUDED.perfil,
          atualizado_em  = now();
  END IF;

  v_result := jsonb_build_object(
    'sucesso', true,
    'usuario_id', p_usuario_id,
    'nome', p_nome_completo,
    'perfil', p_perfil,
    'instituicao_id', p_instituicao_id
  );

  RETURN v_result;
EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object('sucesso', false, 'erro', SQLERRM);
END;
$$;

-- ============================================================
-- SEÇÃO 2: INCLUSÃO DE USUÁRIOS
-- ============================================================
-- IMPORTANTE: No Supabase, o registro em auth.users é criado
-- pelo processo de autenticação (signUp). O que fazemos aqui
-- é completar os dados nas tabelas públicas para usuários
-- que já foram criados via autenticação.
--
-- Para criar usuários diretamente via SQL (sem app), use a
-- função auth.users com a extensão pgcrypto disponível.
-- ============================================================

-- ----------------------------------------------------------
-- 2A. Criar instituição de exemplo (se não existir)
-- ----------------------------------------------------------
INSERT INTO public.instituicoes (id, nome, slug, cor_primaria, cor_secundaria)
VALUES (
  '00000000-0000-0000-0000-000000000001',
  'Escola Demonstração',
  'escola-demonstracao',
  '#1A56DB',
  '#0694A2'
)
ON CONFLICT (slug) DO UPDATE
  SET nome = EXCLUDED.nome;

-- ----------------------------------------------------------
-- 2B. Completar cadastro do super usuário existente
--     (substitua o UUID pelo ID real do seu usuário em auth.users)
-- ----------------------------------------------------------

-- PASSO 1: Descubra o UUID do seu usuário rodando:
--   SELECT id, email FROM auth.users ORDER BY created_at;
--
-- PASSO 2: Substitua 'SEU-UUID-AQUI' pelo ID encontrado e execute:

DO $$
DECLARE
  v_usuario_id uuid;
  v_inst_id    uuid := '00000000-0000-0000-0000-000000000001';
BEGIN
  -- Pega o primeiro usuário cadastrado (mais antigo = super usuário)
  SELECT id INTO v_usuario_id
  FROM auth.users
  ORDER BY created_at
  LIMIT 1;

  IF v_usuario_id IS NULL THEN
    RAISE NOTICE 'Nenhum usuário encontrado em auth.users';
    RETURN;
  END IF;

  RAISE NOTICE 'Completando cadastro do usuário: %', v_usuario_id;

  -- Perfil
  INSERT INTO public.perfis (id, nome_completo)
  VALUES (v_usuario_id, 'Super Administrador')
  ON CONFLICT (id) DO UPDATE
    SET nome_completo = CASE
          WHEN perfis.nome_completo = '' OR perfis.nome_completo IS NULL
          THEN 'Super Administrador'
          ELSE perfis.nome_completo
        END,
        atualizado_em = now();

  -- Configurações
  INSERT INTO public.configuracoes_usuario (usuario_id)
  VALUES (v_usuario_id)
  ON CONFLICT (usuario_id) DO NOTHING;

  -- Papel super_admin na instituição demo
  INSERT INTO public.perfis_usuario (usuario_id, instituicao_id, perfil)
  VALUES (v_usuario_id, v_inst_id, 'super_admin')
  ON CONFLICT (usuario_id, instituicao_id, perfil) DO UPDATE
    SET ativo = true;

  -- Contexto ativo
  INSERT INTO public.contexto_ativo (usuario_id, instituicao_id, perfil, perfil_id)
  VALUES (v_usuario_id, v_inst_id, 'super_admin', v_usuario_id)
  ON CONFLICT (usuario_id) DO UPDATE
    SET instituicao_id = EXCLUDED.instituicao_id,
        perfil         = EXCLUDED.perfil,
        atualizado_em  = now();

  RAISE NOTICE 'Cadastro do super usuário concluído com sucesso!';
END $$;

-- ----------------------------------------------------------
-- 2C. Incluir usuário manualmente por UUID conhecido
--     (descomente e ajuste os valores conforme necessário)
-- ----------------------------------------------------------

/*
-- Exemplo: adicionar um professor
SELECT public.criar_usuario_completo(
  p_usuario_id     := 'UUID-DO-USUARIO-NO-AUTH',     -- substitua
  p_nome_completo  := 'João da Silva',
  p_perfil         := 'professor',
  p_instituicao_id := '00000000-0000-0000-0000-000000000001'
);

-- Exemplo: adicionar um aluno
SELECT public.criar_usuario_completo(
  p_usuario_id     := 'UUID-DO-USUARIO-NO-AUTH',
  p_nome_completo  := 'Maria Souza',
  p_perfil         := 'aluno',
  p_instituicao_id := '00000000-0000-0000-0000-000000000001'
);

-- Exemplo: adicionar um admin em outra instituição
SELECT public.criar_usuario_completo(
  p_usuario_id     := 'UUID-DO-USUARIO-NO-AUTH',
  p_nome_completo  := 'Carlos Admin',
  p_perfil         := 'admin',
  p_instituicao_id := 'UUID-DA-OUTRA-INSTITUICAO'
);
*/

-- ----------------------------------------------------------
-- 2D. Adicionar papel extra a usuário já existente
--     (um usuário pode ter múltiplos papéis em instituições diferentes)
-- ----------------------------------------------------------

/*
INSERT INTO public.perfis_usuario (usuario_id, instituicao_id, perfil)
VALUES (
  'UUID-DO-USUARIO',
  'UUID-DA-INSTITUICAO',
  'coordenador'   -- 'super_admin'|'admin'|'coordenador'|'professor'|'aluno'|'responsavel'
)
ON CONFLICT (usuario_id, instituicao_id, perfil) DO UPDATE
  SET ativo = true;
*/

-- ============================================================
-- SEÇÃO 3: ATUALIZAÇÃO DE USUÁRIOS
-- ============================================================

-- ----------------------------------------------------------
-- 3A. Atualizar nome completo
-- ----------------------------------------------------------

/*
UPDATE public.perfis
SET
  nome_completo = 'Novo Nome Completo',
  atualizado_em = now()
WHERE id = 'UUID-DO-USUARIO';
*/

-- ----------------------------------------------------------
-- 3B. Atualizar dados pessoais completos
-- ----------------------------------------------------------

/*
UPDATE public.perfis
SET
  nome_completo   = 'Nome Atualizado',
  avatar_url      = 'https://exemplo.com/foto.jpg',
  telefone        = '(11) 99999-9999',
  data_nascimento = '1990-05-15',
  atualizado_em   = now()
WHERE id = 'UUID-DO-USUARIO';
*/

-- ----------------------------------------------------------
-- 3C. Alterar perfil (papel) de um usuário
-- ----------------------------------------------------------

/*
UPDATE public.perfis_usuario
SET perfil = 'coordenador'   -- novo perfil
WHERE usuario_id    = 'UUID-DO-USUARIO'
  AND instituicao_id = 'UUID-DA-INSTITUICAO';
*/

-- ----------------------------------------------------------
-- 3D. Reativar usuário desativado
-- ----------------------------------------------------------

/*
UPDATE public.perfis_usuario
SET ativo = true
WHERE usuario_id = 'UUID-DO-USUARIO';
*/

-- ----------------------------------------------------------
-- 3E. Desativar usuário (sem excluir) em uma instituição
-- ----------------------------------------------------------

/*
UPDATE public.perfis_usuario
SET ativo = false
WHERE usuario_id    = 'UUID-DO-USUARIO'
  AND instituicao_id = 'UUID-DA-INSTITUICAO';
*/

-- ----------------------------------------------------------
-- 3F. Atualizar configurações do usuário
-- ----------------------------------------------------------

/*
UPDATE public.configuracoes_usuario
SET
  notif_email      = true,
  notif_push       = true,
  notif_sms        = false,
  idioma           = 'pt-BR',
  tema             = 'dark',      -- 'light' | 'dark' | 'system'
  login_biometrico = false,
  atualizado_em    = now()
WHERE usuario_id = 'UUID-DO-USUARIO';
*/

-- ----------------------------------------------------------
-- 3G. Trocar contexto ativo do usuário
--     (alterar qual instituição/papel está ativo no login)
-- ----------------------------------------------------------

/*
UPDATE public.contexto_ativo
SET
  instituicao_id = 'UUID-DA-INSTITUICAO',
  perfil         = 'admin',
  atualizado_em  = now()
WHERE usuario_id = 'UUID-DO-USUARIO';
*/

-- ----------------------------------------------------------
-- 3H. Atualizar dados da instituição
-- ----------------------------------------------------------

/*
UPDATE public.instituicoes
SET
  nome          = 'Nome Atualizado da Escola',
  cor_primaria  = '#057A55',
  cor_secundaria = '#0694A2',
  endereco      = 'Rua Exemplo, 123',
  cidade        = 'São Paulo',
  telefone      = '(11) 3333-4444',
  email         = 'contato@escola.edu.br',
  atualizado_em = now()
WHERE id = 'UUID-DA-INSTITUICAO';
*/

-- ============================================================
-- SEÇÃO 4: EXCLUSÃO DE USUÁRIOS
-- ============================================================
-- ATENÇÃO: A exclusão em auth.users apaga em cascata todos os
-- dados do usuário (perfis, papéis, configurações, etc.)
-- devido às FOREIGN KEY com ON DELETE CASCADE.
--
-- Recomendação: prefira DESATIVAR (seção 3E) em vez de excluir.
-- ============================================================

-- ----------------------------------------------------------
-- 4A. Remover papel do usuário de uma instituição específica
--     (mantém o usuário no sistema, apenas remove da instituição)
-- ----------------------------------------------------------

/*
DELETE FROM public.perfis_usuario
WHERE usuario_id    = 'UUID-DO-USUARIO'
  AND instituicao_id = 'UUID-DA-INSTITUICAO'
  AND perfil         = 'professor';
*/

-- ----------------------------------------------------------
-- 4B. Remover usuário de TODAS as instituições
--     (mantém o login, mas perde todos os acessos)
-- ----------------------------------------------------------

/*
DELETE FROM public.perfis_usuario
WHERE usuario_id = 'UUID-DO-USUARIO';
*/

-- ----------------------------------------------------------
-- 4C. Excluir TODOS os dados públicos do usuário
--     (mantém o login em auth.users; use se quiser reter o e-mail)
-- ----------------------------------------------------------

/*
-- Remove contexto ativo
DELETE FROM public.contexto_ativo       WHERE usuario_id = 'UUID-DO-USUARIO';
-- Remove sessões
DELETE FROM public.sessoes_usuario      WHERE usuario_id = 'UUID-DO-USUARIO';
-- Remove configurações
DELETE FROM public.configuracoes_usuario WHERE usuario_id = 'UUID-DO-USUARIO';
-- Remove papéis
DELETE FROM public.perfis_usuario       WHERE usuario_id = 'UUID-DO-USUARIO';
-- Remove perfil (por último, pois outros podem referenciar)
DELETE FROM public.perfis               WHERE id = 'UUID-DO-USUARIO';
*/

-- ----------------------------------------------------------
-- 4D. Excluir usuário COMPLETAMENTE (incluindo auth.users)
--     IRREVERSÍVEL – apaga tudo em cascata
-- ----------------------------------------------------------

/*
DELETE FROM auth.users
WHERE id = 'UUID-DO-USUARIO';
*/

-- ----------------------------------------------------------
-- 4E. Excluir todos os usuários inativos de uma instituição
--     (limpeza em massa dos desativados)
-- ----------------------------------------------------------

/*
DELETE FROM public.perfis_usuario
WHERE instituicao_id = 'UUID-DA-INSTITUICAO'
  AND ativo = false;
*/

-- ============================================================
-- SEÇÃO 5: CONSULTAS DE VERIFICAÇÃO
-- ============================================================

-- 5A. Listar todos os usuários com seus perfis e instituições
SELECT
  au.id                                    AS usuario_id,
  au.email,
  p.nome_completo,
  p.telefone,
  p.data_nascimento,
  pu.perfil,
  pu.ativo,
  i.nome                                   AS instituicao,
  ca.perfil                                AS contexto_perfil_ativo,
  cu.idioma,
  cu.tema,
  au.created_at                            AS criado_em,
  au.last_sign_in_at                       AS ultimo_login
FROM auth.users au
LEFT JOIN public.perfis             p  ON p.id            = au.id
LEFT JOIN public.perfis_usuario     pu ON pu.usuario_id   = au.id
LEFT JOIN public.instituicoes       i  ON i.id            = pu.instituicao_id
LEFT JOIN public.contexto_ativo     ca ON ca.usuario_id   = au.id
LEFT JOIN public.configuracoes_usuario cu ON cu.usuario_id = au.id
ORDER BY au.created_at;

-- ----------------------------------------------------------
-- 5B. Verificar usuários com cadastro INCOMPLETO
--     (sem perfil, sem configurações ou sem papel)
-- ----------------------------------------------------------
SELECT
  au.id,
  au.email,
  au.created_at,
  CASE WHEN p.id  IS NULL THEN 'SEM PERFIL'          ELSE 'ok' END AS perfil_status,
  CASE WHEN cu.id IS NULL THEN 'SEM CONFIGURAÇÕES'    ELSE 'ok' END AS config_status,
  CASE WHEN pu.id IS NULL THEN 'SEM PAPEL/INSTITUIÇÃO' ELSE 'ok' END AS papel_status
FROM auth.users au
LEFT JOIN public.perfis              p  ON p.id           = au.id
LEFT JOIN public.configuracoes_usuario cu ON cu.usuario_id = au.id
LEFT JOIN public.perfis_usuario      pu ON pu.usuario_id  = au.id
WHERE p.id IS NULL OR cu.id IS NULL OR pu.id IS NULL
ORDER BY au.created_at;

-- ----------------------------------------------------------
-- 5C. Listar usuários por instituição e perfil
-- ----------------------------------------------------------
SELECT
  i.nome  AS instituicao,
  pu.perfil,
  COUNT(*) FILTER (WHERE pu.ativo = true)  AS ativos,
  COUNT(*) FILTER (WHERE pu.ativo = false) AS inativos
FROM public.perfis_usuario pu
JOIN public.instituicoes i ON i.id = pu.instituicao_id
GROUP BY i.nome, pu.perfil
ORDER BY i.nome, pu.perfil;
