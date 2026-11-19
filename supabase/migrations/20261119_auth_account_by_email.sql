-- APLICADO em 19/11/2026. Busca de conta por e-mail sem efeito colateral (substitui generate_link em findAuthAccount).
create or replace function public.auth_account_by_email(p_email text)
returns jsonb language sql stable security definer set search_path = '' as $$
  select jsonb_build_object('id', u.id, 'email', u.email, 'created_at', u.created_at, 'last_sign_in_at', u.last_sign_in_at,
    'email_confirmed_at', u.email_confirmed_at, 'invited_at', u.invited_at, 'user_metadata', coalesce(u.raw_user_meta_data, '{}'::jsonb))
  from auth.users u where lower(u.email) = lower(trim(p_email)) and u.deleted_at is null limit 1
$$;
revoke all on function public.auth_account_by_email(text) from public, anon, authenticated;
grant execute on function public.auth_account_by_email(text) to service_role;
