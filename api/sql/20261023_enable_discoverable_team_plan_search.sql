begin;

do $migration$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'teams'
      and policyname = 'authenticated users can find matchmaking teams'
  ) then
    create policy "authenticated users can find matchmaking teams"
      on public.teams
      for select
      to authenticated
      using (allow_matchmaking is true);
  end if;

  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'team_plans'
      and policyname = 'authenticated users can find matchmaking team plans'
  ) then
    create policy "authenticated users can find matchmaking team plans"
      on public.team_plans
      for select
      to authenticated
      using (
        mode = 'team'
        and team_id is not null
        and route_id is not null
        and exists (
          select 1
          from public.teams t
          where t.id = team_plans.team_id
            and t.allow_matchmaking is true
        )
      );
  end if;

  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'waypoints'
      and policyname = 'authenticated users can find waypoints for matchmaking plans'
  ) then
    create policy "authenticated users can find waypoints for matchmaking plans"
      on public.waypoints
      for select
      to authenticated
      using (
        exists (
          select 1
          from public.team_plans p
          join public.teams t on t.id = p.team_id
          where p.route_id = waypoints.route_id
            and p.mode = 'team'
            and t.allow_matchmaking is true
        )
      );
  end if;
end;
$migration$;

commit;
