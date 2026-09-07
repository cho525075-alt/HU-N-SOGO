create extension if not exists pgcrypto;
create table if not exists public.workspaces (id uuid primary key default gen_random_uuid(),name text not null,join_code text not null unique default upper(substr(replace(gen_random_uuid()::text,'-',''),1,8)),owner_id uuid not null references auth.users(id) on delete cascade,created_at timestamptz not null default now());
create table if not exists public.workspace_members (workspace_id uuid not null references public.workspaces(id) on delete cascade,user_id uuid not null references auth.users(id) on delete cascade,role text not null default 'member' check (role in ('owner','member')),created_at timestamptz not null default now(),primary key(workspace_id,user_id));
create table if not exists public.projects (id uuid primary key default gen_random_uuid(),workspace_id uuid not null references public.workspaces(id) on delete cascade,name text not null,data jsonb not null default '{}'::jsonb,created_by uuid not null references auth.users(id),updated_by uuid not null references auth.users(id),created_at timestamptz not null default now(),updated_at timestamptz not null default now());
alter table public.workspaces enable row level security; alter table public.workspace_members enable row level security; alter table public.projects enable row level security;
create or replace function public.is_workspace_member(wid uuid) returns boolean language sql stable security definer set search_path=public as $$ select exists(select 1 from public.workspace_members where workspace_id=wid and user_id=auth.uid()); $$;
create or replace function public.is_workspace_owner(wid uuid) returns boolean language sql stable security definer set search_path=public as $$ select exists(select 1 from public.workspace_members where workspace_id=wid and user_id=auth.uid() and role='owner'); $$;
drop policy if exists "workspace members can read workspace" on public.workspaces; create policy "workspace members can read workspace" on public.workspaces for select to authenticated using(public.is_workspace_member(id));
drop policy if exists "members can read memberships" on public.workspace_members; create policy "members can read memberships" on public.workspace_members for select to authenticated using(public.is_workspace_member(workspace_id));
drop policy if exists "members can read projects" on public.projects; create policy "members can read projects" on public.projects for select to authenticated using(public.is_workspace_member(workspace_id));
drop policy if exists "members can insert projects" on public.projects; create policy "members can insert projects" on public.projects for insert to authenticated with check(public.is_workspace_member(workspace_id) and created_by=auth.uid() and updated_by=auth.uid());
drop policy if exists "members can update projects" on public.projects; create policy "members can update projects" on public.projects for update to authenticated using(public.is_workspace_member(workspace_id)) with check(public.is_workspace_member(workspace_id) and updated_by=auth.uid());
drop policy if exists "owners can delete projects" on public.projects; create policy "owners can delete projects" on public.projects for delete to authenticated using(public.is_workspace_owner(workspace_id));
create or replace function public.create_workspace(p_name text) returns uuid language plpgsql security definer set search_path=public as $$ declare wid uuid; begin if auth.uid() is null then raise exception 'Chưa đăng nhập'; end if; insert into public.workspaces(name,owner_id) values(coalesce(nullif(trim(p_name),''),'Đội sản xuất'),auth.uid()) returning id into wid; insert into public.workspace_members(workspace_id,user_id,role) values(wid,auth.uid(),'owner'); return wid; end; $$;
create or replace function public.join_workspace_by_code(p_code text) returns uuid language plpgsql security definer set search_path=public as $$ declare wid uuid; begin if auth.uid() is null then raise exception 'Chưa đăng nhập'; end if; select id into wid from public.workspaces where join_code=upper(trim(p_code)); if wid is null then raise exception 'Mã đội không đúng'; end if; insert into public.workspace_members(workspace_id,user_id,role) values(wid,auth.uid(),'member') on conflict(workspace_id,user_id) do nothing; return wid; end; $$;
grant execute on function public.create_workspace(text) to authenticated; grant execute on function public.join_workspace_by_code(text) to authenticated; grant execute on function public.is_workspace_member(uuid) to authenticated; grant execute on function public.is_workspace_owner(uuid) to authenticated;


-- ============================================================
-- V11 TEAM CONTROL UPGRADE
-- Có thể chạy phần này trên database đã dùng V10.
-- ============================================================
alter table public.workspace_members add column if not exists member_email text;
alter table public.workspace_members add column if not exists display_name text;

create table if not exists public.scene_assignments (
  project_id uuid not null references public.projects(id) on delete cascade,
  scene_id text not null,
  assigned_to uuid not null references auth.users(id) on delete cascade,
  assigned_by uuid not null references auth.users(id) on delete cascade,
  status text not null default 'ĐÃ GIAO',
  updated_at timestamptz not null default now(),
  primary key(project_id,scene_id)
);
create table if not exists public.scene_locks (
  project_id uuid not null references public.projects(id) on delete cascade,
  scene_id text not null,
  locked_by uuid not null references auth.users(id) on delete cascade,
  locked_at timestamptz not null default now(),
  expires_at timestamptz not null default (now()+interval '2 hours'),
  primary key(project_id,scene_id)
);
create table if not exists public.project_versions (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  project_data jsonb not null,
  note text,
  created_by uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);
alter table public.scene_assignments enable row level security;
alter table public.scene_locks enable row level security;
alter table public.project_versions enable row level security;

drop policy if exists "members read assignments" on public.scene_assignments;
create policy "members read assignments" on public.scene_assignments for select to authenticated
using (exists(select 1 from public.projects p where p.id=project_id and public.is_workspace_member(p.workspace_id)));
drop policy if exists "owners manage assignments" on public.scene_assignments;
create policy "owners manage assignments" on public.scene_assignments for all to authenticated
using (exists(select 1 from public.projects p where p.id=project_id and public.is_workspace_owner(p.workspace_id)))
with check (exists(select 1 from public.projects p where p.id=project_id and public.is_workspace_owner(p.workspace_id)));

drop policy if exists "members read locks" on public.scene_locks;
create policy "members read locks" on public.scene_locks for select to authenticated
using (exists(select 1 from public.projects p where p.id=project_id and public.is_workspace_member(p.workspace_id)));

drop policy if exists "members read versions" on public.project_versions;
create policy "members read versions" on public.project_versions for select to authenticated using(public.is_workspace_member(workspace_id));
drop policy if exists "members create versions" on public.project_versions;
create policy "members create versions" on public.project_versions for insert to authenticated
with check(public.is_workspace_member(workspace_id) and created_by=auth.uid());
drop policy if exists "owners delete versions" on public.project_versions;
create policy "owners delete versions" on public.project_versions for delete to authenticated using(public.is_workspace_owner(workspace_id));

create or replace function public.sync_my_member_profile()
returns boolean language plpgsql security definer set search_path=public as $$
begin
  if auth.uid() is null then raise exception 'Chưa đăng nhập'; end if;
  update public.workspace_members set member_email=coalesce(auth.jwt()->>'email',member_email) where user_id=auth.uid();
  return true;
end; $$;

create or replace function public.acquire_scene_lock(p_project_id uuid,p_scene_id text)
returns boolean language plpgsql security definer set search_path=public as $$
declare wid uuid; current_owner uuid; current_exp timestamptz;
begin
  if auth.uid() is null then raise exception 'Chưa đăng nhập'; end if;
  select workspace_id into wid from public.projects where id=p_project_id;
  if wid is null or not public.is_workspace_member(wid) then raise exception 'Không có quyền dự án'; end if;
  delete from public.scene_locks where project_id=p_project_id and scene_id=p_scene_id and expires_at<now();
  select locked_by,expires_at into current_owner,current_exp from public.scene_locks where project_id=p_project_id and scene_id=p_scene_id;
  if current_owner is not null and current_owner<>auth.uid() and current_exp>now() then return false; end if;
  insert into public.scene_locks(project_id,scene_id,locked_by,locked_at,expires_at)
  values(p_project_id,p_scene_id,auth.uid(),now(),now()+interval '2 hours')
  on conflict(project_id,scene_id) do update set locked_by=auth.uid(),locked_at=now(),expires_at=now()+interval '2 hours';
  return true;
end; $$;

create or replace function public.release_scene_lock(p_project_id uuid,p_scene_id text)
returns boolean language plpgsql security definer set search_path=public as $$
declare wid uuid;
begin
  select workspace_id into wid from public.projects where id=p_project_id;
  if wid is null then return false; end if;
  delete from public.scene_locks where project_id=p_project_id and scene_id=p_scene_id
  and (locked_by=auth.uid() or public.is_workspace_owner(wid));
  return true;
end; $$;

grant execute on function public.sync_my_member_profile() to authenticated;
grant execute on function public.acquire_scene_lock(uuid,text) to authenticated;
grant execute on function public.release_scene_lock(uuid,text) to authenticated;
