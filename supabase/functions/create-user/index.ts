// Edge Function: create-user
// Cria um usuário via Admin API sem afetar a sessão do chamador.
// Requer que o chamador seja admin autenticado (validado via JWT).

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    // Valida o JWT do chamador usando o cliente padrão (anon/user)
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Não autorizado.' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const callerClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    // Verifica se o chamador está autenticado
    const { data: { user: caller }, error: callerErr } = await callerClient.auth.getUser();
    if (callerErr || !caller) {
      return new Response(JSON.stringify({ error: 'Não autorizado.' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Verifica se o chamador tem role admin ou coordenador
    const { data: callerRoles } = await callerClient
      .from('user_roles')
      .select('role')
      .eq('user_id', caller.id)
      .eq('is_active', true)
      .in('role', ['admin', 'coordenador']);

    if (!callerRoles || callerRoles.length === 0) {
      return new Response(JSON.stringify({ error: 'Permissão negada.' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Lê o body da requisição
    const { email, password, fullName, role, institutionId } = await req.json();

    if (!email || !password || !fullName || !role || !institutionId) {
      return new Response(JSON.stringify({ error: 'Campos obrigatórios ausentes.' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Cliente com service role para operações privilegiadas
    const adminClient = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // Cria o usuário no Auth sem afetar a sessão do admin
    const { data: newUser, error: createErr } = await adminClient.auth.admin.createUser({
      email,
      password,
      email_confirm: true, // confirma automaticamente sem enviar e-mail
    });

    if (createErr || !newUser?.user) {
      return new Response(
        JSON.stringify({ error: createErr?.message ?? 'Erro ao criar usuário.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const uid = newUser.user.id;

    // Cria o perfil
    const { error: profileErr } = await adminClient
      .from('profiles')
      .upsert({ id: uid, full_name: fullName }, { onConflict: 'id' });
    if (profileErr) {
      // Rollback: remove o usuário criado
      await adminClient.auth.admin.deleteUser(uid);
      return new Response(JSON.stringify({ error: profileErr.message }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Cria configurações padrão
    await adminClient
      .from('user_settings')
      .upsert({ user_id: uid }, { onConflict: 'user_id' });

    await adminClient
      .from('configuracoes_usuario')
      .upsert({ usuario_id: uid }, { onConflict: 'usuario_id' });

    // Atribui o papel na instituição
    const { error: roleErr } = await adminClient
      .from('user_roles')
      .upsert({ user_id: uid, institution_id: institutionId, role }, { onConflict: 'user_id,institution_id' });

    if (roleErr) {
      await adminClient.auth.admin.deleteUser(uid);
      return new Response(JSON.stringify({ error: roleErr.message }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ id: uid }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message ?? 'Erro interno.' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
