/*
  Preenche nome_completo em perfis que estão vazios,
  usando a parte local do email do usuário como nome temporário.
  O admin pode atualizar depois nas configurações.
*/
UPDATE public.perfis p
SET nome_completo = split_part(u.email, '@', 1)
FROM auth.users u
WHERE p.id = u.id
  AND (p.nome_completo IS NULL OR p.nome_completo = '');
