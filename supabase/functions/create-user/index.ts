// Edge Function: create-user
// Cria um usuário via Admin API sem afetar a sessão do chamador.
// Usa as tabelas reais em português (perfis, perfis_usuario, etc.)
// @ts-nocheck — este arquivo roda no runtime Deno, não no Node/React Native.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!;

    // 1. Valida o JWT do chamador
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return json({ error: 'Não autorizado.' }, 401);
    }

    const callerClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user: caller }, error: callerErr } = await callerClient.auth.getUser();
    if (callerErr || !caller) {
      return json({ error: 'Token inválido ou expirado.' }, 401);
    }

    // 2. Cria o adminClient com service role — bypass RLS para todas as operações
    const adminClient = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // 3. Verifica permissão usando adminClient (contorna RLS)
    const { data: callerRoles, error: rolesCheckErr } = await adminClient
      .from('perfis_usuario')
      .select('perfil')
      .eq('usuario_id', caller.id)
      .eq('ativo', true)
      .in('perfil', ['admin', 'coordenador', 'super_admin']);

    if (rolesCheckErr) {
      return json({ error: `Erro ao verificar permissão: ${rolesCheckErr.message}` }, 500);
    }

    if (!callerRoles || callerRoles.length === 0) {
      return json({ error: 'Permissão negada. Você precisa ser admin ou coordenador.' }, 403);
    }

    // 4. Lê o body
    const body = await req.json();
    const { email, password, fullName, role, institutionId } = body;

    if (!email || !password || !fullName || !role || !institutionId) {
      return json({ error: 'Campos obrigatórios ausentes: email, password, fullName, role, institutionId.' }, 400);
    }

    // 5. Cria o usuário no Auth (sem afetar sessão do admin)
    const { data: newUser, error: createErr } = await adminClient.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });

    if (createErr || !newUser?.user) {
      return json({ error: createErr?.message ?? 'Erro ao criar usuário no Auth.' }, 400);
    }

    const uid = newUser.user.id;

    // 6. Cria o perfil
    const { error: profileErr } = await adminClient
      .from('perfis')
      .upsert({ id: uid, nome_completo: fullName }, { onConflict: 'id' });

    if (profileErr) {
      await adminClient.auth.admin.deleteUser(uid);
      return json({ error: `Erro ao criar perfil: ${profileErr.message}` }, 500);
    }

    // 7. Cria configurações padrão
    await adminClient
      .from('configuracoes_usuario')
      .upsert({ usuario_id: uid }, { onConflict: 'usuario_id' });

    // 8. Atribui papel na instituição
    // Com a nova constraint (usuario_id, instituicao_id) UNIQUE, usa upsert simples
    const { error: roleErr } = await adminClient
      .from('perfis_usuario')
      .upsert(
        { usuario_id: uid, instituicao_id: institutionId, perfil: role, ativo: true },
        { onConflict: 'usuario_id,instituicao_id' }
      );

    if (roleErr) {
      await adminClient.auth.admin.deleteUser(uid);
      return json({ error: `Erro ao atribuir papel: ${roleErr.message}` }, 500);
    }

    return json({ id: uid }, 200);

  } catch (err: any) {
    return json({ error: err.message ?? 'Erro interno.' }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}
