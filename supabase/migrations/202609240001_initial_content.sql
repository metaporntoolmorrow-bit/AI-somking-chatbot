-- First production integration slice. The source catalog is imported as simulated/draft.
create table if not exists public.profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  access_role text not null default 'user' check (access_role in ('admin1','admin2','user')),
  account_status text not null default 'active' check (account_status in ('active','suspended')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.role_changes (
  id uuid primary key default gen_random_uuid(),
  target_user_id uuid not null references public.profiles(user_id),
  actor_user_id uuid references public.profiles(user_id),
  old_role text,
  new_role text,
  old_status text,
  new_status text,
  reason text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.content_audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_user_id uuid not null references public.profiles(user_id),
  release_id uuid,
  entity_type text not null,
  entity_code text not null,
  action text not null,
  before_value jsonb,
  after_value jsonb,
  reason text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.content_releases (
  id uuid primary key default gen_random_uuid(),
  version_label text not null unique,
  workflow_status text not null default 'draft' check (workflow_status in ('draft','in_review','published','archived','revoked')),
  trust_status text not null default 'simulated' check (trust_status in ('simulated','partially_verified','approved')),
  source_manifest_hash text,
  change_note text,
  created_by uuid references public.profiles(user_id),
  approved_by uuid references public.profiles(user_id),
  approved_at timestamptz,
  published_at timestamptz,
  revoked_at timestamptz,
  created_at timestamptz not null default now(),
  constraint published_only_when_approved check (workflow_status <> 'published' or (trust_status = 'approved' and approved_by is not null and approved_at is not null))
);

create table if not exists public.active_content_release (
  singleton_id smallint primary key default 1 check (singleton_id = 1),
  release_id uuid not null references public.content_releases(id),
  activated_at timestamptz not null default now(),
  activated_by uuid references public.profiles(user_id)
);

create table if not exists public.packages (
  release_id uuid not null references public.content_releases(id),
  code text not null,
  title_th text not null,
  goal_th text not null,
  setting_label_th text,
  level_label_th text,
  measures_label_th text,
  roles_label_th text,
  limitations_th text,
  trust_status text not null default 'simulated' check (trust_status in ('simulated','partially_verified','approved')),
  updated_at timestamptz not null default now(),
  primary key (release_id, code)
);

create table if not exists public.tools (
  release_id uuid not null references public.content_releases(id),
  code text not null,
  title_th text not null,
  description_th text,
  tool_kind text,
  trust_status text not null default 'simulated' check (trust_status in ('simulated','partially_verified','approved')),
  lifecycle_status text not null default 'active' check (lifecycle_status in ('active','inactive','withdrawn')),
  source_payload jsonb not null default '{}'::jsonb,
  primary key (release_id, code)
);

create table if not exists public.scenarios (
  release_id uuid not null references public.content_releases(id),
  code text not null,
  package_code text not null,
  setting_code text not null,
  operator_role_code text not null,
  target_group_code text not null,
  intervention_level text not null check (intervention_level in ('prevention','cessation')),
  catalogue_status text not null check (catalogue_status in ('primary_available','support_only','no_tool')),
  content_status text not null default 'simulated' check (content_status in ('simulated','partially_verified','approved')),
  summary_th text,
  source_payload jsonb not null default '{}'::jsonb,
  primary key (release_id, code),
  foreign key (release_id, package_code) references public.packages(release_id, code),
  unique (release_id, setting_code, package_code, operator_role_code, target_group_code, intervention_level)
);

create table if not exists public.scenario_tools (
  release_id uuid not null,
  scenario_code text not null,
  tool_code text not null,
  slot text not null check (slot in ('primary','supporting','measurement','reference')),
  display_order integer not null check (display_order > 0),
  reason_th text,
  primary key (release_id, scenario_code, tool_code, slot),
  foreign key (release_id, scenario_code) references public.scenarios(release_id, code) on delete cascade,
  foreign key (release_id, tool_code) references public.tools(release_id, code),
  unique (release_id, scenario_code, slot, display_order)
);

create index if not exists scenario_lookup_idx on public.scenarios
  (release_id, setting_code, package_code, operator_role_code, target_group_code, intervention_level);

create or replace function public.create_profile_for_new_user()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles (user_id) values (new.id);
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
for each row execute function public.create_profile_for_new_user();

create or replace function public.save_draft_package(
  p_release_id uuid,
  p_code text,
  p_title text,
  p_goal text,
  p_note text,
  p_expected_updated_at timestamptz
) returns timestamptz language plpgsql security definer set search_path = '' as $$
declare
  previous_row public.packages%rowtype;
  new_updated_at timestamptz := clock_timestamp();
begin
  if not exists (
    select 1 from public.profiles p
    where p.user_id = (select auth.uid()) and p.account_status = 'active'
      and p.access_role in ('admin1','admin2')
  ) then raise exception 'not_allowed' using errcode = '42501'; end if;
  if length(trim(p_title)) = 0 or length(p_title) > 200
    or length(trim(p_goal)) = 0 or length(p_goal) > 3000
    or length(p_note) > 3000 then raise exception 'invalid_content' using errcode = '22023'; end if;
  if not exists (select 1 from public.content_releases r where r.id = p_release_id and r.workflow_status = 'draft')
    then raise exception 'not_draft' using errcode = '22023'; end if;
  select * into previous_row from public.packages
    where release_id = p_release_id and code = p_code for update;
  if not found or previous_row.updated_at <> p_expected_updated_at
    then raise exception 'edit_conflict' using errcode = '40001'; end if;
  update public.packages set title_th = trim(p_title), goal_th = trim(p_goal),
    limitations_th = trim(p_note), updated_at = new_updated_at
    where release_id = p_release_id and code = p_code;
  insert into public.content_audit_logs
    (actor_user_id, release_id, entity_type, entity_code, action, before_value, after_value, reason)
    values ((select auth.uid()), p_release_id, 'package', p_code, 'update',
      jsonb_build_object('title',previous_row.title_th,'goal',previous_row.goal_th,'note',previous_row.limitations_th),
      jsonb_build_object('title',trim(p_title),'goal',trim(p_goal),'note',trim(p_note)),
      'แก้ไขชุดแผนฉบับร่าง');
  return new_updated_at;
end;
$$;

revoke all on function public.save_draft_package(uuid,text,text,text,text,timestamptz) from public, anon;
grant execute on function public.save_draft_package(uuid,text,text,text,text,timestamptz) to authenticated;

-- Do not leave new public tables writable through default Supabase grants.
revoke all on public.profiles, public.role_changes, public.content_audit_logs, public.content_releases,
  public.active_content_release, public.packages, public.tools,
  public.scenarios, public.scenario_tools from anon, authenticated;

alter table public.profiles enable row level security;
alter table public.role_changes enable row level security;
alter table public.content_audit_logs enable row level security;
alter table public.content_releases enable row level security;
alter table public.active_content_release enable row level security;
alter table public.packages enable row level security;
alter table public.tools enable row level security;
alter table public.scenarios enable row level security;
alter table public.scenario_tools enable row level security;

grant select on public.profiles to authenticated;
create policy "read own profile" on public.profiles for select to authenticated
  using (user_id = (select auth.uid()));

-- These policies expose only fully approved published content.
grant select on public.active_content_release, public.content_releases,
  public.packages, public.tools, public.scenarios, public.scenario_tools to anon, authenticated;

create policy "read active release pointer" on public.active_content_release for select to anon, authenticated
  using (exists (select 1 from public.content_releases r where r.id = release_id and r.workflow_status = 'published' and r.trust_status = 'approved'));
create policy "read published release" on public.content_releases for select to anon, authenticated
  using (workflow_status = 'published' and trust_status = 'approved');
create policy "read approved packages" on public.packages for select to anon, authenticated
  using (trust_status = 'approved' and exists (select 1 from public.active_content_release a where a.release_id = packages.release_id));
create policy "read approved tools" on public.tools for select to anon, authenticated
  using (trust_status = 'approved' and lifecycle_status = 'active' and exists (select 1 from public.active_content_release a where a.release_id = tools.release_id));
create policy "read approved scenarios" on public.scenarios for select to anon, authenticated
  using (content_status = 'approved' and exists (select 1 from public.active_content_release a where a.release_id = scenarios.release_id));
create policy "read approved scenario tools" on public.scenario_tools for select to anon, authenticated
  using (exists (select 1 from public.scenarios s where s.release_id = scenario_tools.release_id and s.code = scenario_tools.scenario_code));

-- Draft editing and member changes require a separate server operation with a
-- fresh role check. No browser role or ?role= parameter can grant access.
