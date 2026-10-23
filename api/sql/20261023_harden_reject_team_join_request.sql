begin;

create or replace function public.reject_team_join_request(
  p_team_id text,
  p_user_id uuid
)
returns void
language plpgsql
security definer
set search_path to ''
as $function$
declare
  v_requester_id uuid := auth.uid();
  v_owner_id uuid;
  v_team_name text;
begin
  if v_requester_id is null then
    raise exception 'Bạn cần đăng nhập.';
  end if;

  select t.owner_id, t.name
  into v_owner_id, v_team_name
  from public.teams t
  where t.id = p_team_id;

  if v_owner_id is null then
    raise exception 'Không tìm thấy nhóm.';
  end if;

  if v_owner_id is distinct from v_requester_id then
    raise exception 'Chỉ chủ nhóm mới có thể từ chối yêu cầu.';
  end if;

  delete from public.team_join_requests
  where team_id = p_team_id
    and user_id = p_user_id;

  if found then
    insert into public.notifications (
      user_id,
      title,
      body,
      type,
      target_id
    )
    values (
      p_user_id,
      'Yêu cầu tham gia nhóm',
      'Yêu cầu tham gia '
        || coalesce(v_team_name, 'nhóm')
        || ' chưa được chấp nhận.',
      'team',
      p_team_id
    );
  end if;
end;
$function$;

revoke execute on function public.reject_team_join_request(text, uuid)
  from public, anon;
grant execute on function public.reject_team_join_request(text, uuid)
  to authenticated;

commit;
