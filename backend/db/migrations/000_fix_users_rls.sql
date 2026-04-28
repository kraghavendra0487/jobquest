-- 000_fix_users_rls.sql
-- Drop and recreate the existing user policies with the recursion + privilege fixes.

-- 1. SECURITY DEFINER helper — bypasses RLS internally so it can be called from policies on users.
create or replace function public.is_admin()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.users where id = auth.uid() and role = 'admin'
  );
$$;

revoke all on function public.is_admin() from public;
grant execute on function public.is_admin() to authenticated;

-- 2. Drop existing policies
drop policy if exists "Users can view their own profile" on public.users;
drop policy if exists "Users can insert their own profile" on public.users;
drop policy if exists "Users can update their own profile" on public.users;
drop policy if exists "Admins can view all profiles" on public.users;
drop policy if exists "Admins can update all profiles" on public.users;

-- 3. Recreate, fixed
create policy "Users can view their own profile"
  on public.users for select to authenticated
  using (auth.uid() = id);

create policy "Users can insert their own profile"
  on public.users for insert to authenticated
  with check (auth.uid() = id and role = 'student');
  -- forces every self-insert to be a student, regardless of what the client sends

create policy "Users can update their own profile"
  on public.users for update to authenticated
  using (auth.uid() = id)
  with check (auth.uid() = id and role = 'student');
  -- prevents users from changing their own id or escalating to admin

create policy "Admins can view all profiles"
  on public.users for select to authenticated
  using (public.is_admin());

create policy "Admins can update all profiles"
  on public.users for update to authenticated
  using (public.is_admin())
  with check (public.is_admin());
  -- admins can flip another user's role; service_role still bypasses everything
