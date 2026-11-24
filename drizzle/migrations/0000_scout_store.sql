create type public.app_role as enum ('admin','keeper','member');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null default '',
  email text,
  created_at timestamptz not null default now()
);
grant select, update on public.profiles to authenticated;
grant all on public.profiles to service_role;
alter table public.profiles enable row level security;

create table public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  role app_role not null,
  unique (user_id, role)
);
grant select, insert, update, delete on public.user_roles to authenticated;
grant all on public.user_roles to service_role;
alter table public.user_roles enable row level security;

create or replace function public.has_role(_user_id uuid, _role app_role)
returns boolean language sql stable security definer set search_path = public
as $$ select exists (select 1 from public.user_roles where user_id = _user_id and role = _role) $$;

create or replace function public.is_staff(_user_id uuid)
returns boolean language sql stable security definer set search_path = public
as $$ select exists (select 1 from public.user_roles where user_id = _user_id and role in ('admin','keeper')) $$;

create policy "profiles read" on public.profiles for select to authenticated using (true);
create policy "profiles update own" on public.profiles for update to authenticated using (auth.uid() = id);

create policy "roles read own or admin" on public.user_roles for select to authenticated
  using (auth.uid() = user_id or public.has_role(auth.uid(),'admin'));
create policy "roles admin insert" on public.user_roles for insert to authenticated with check (public.has_role(auth.uid(),'admin'));
create policy "roles admin update" on public.user_roles for update to authenticated using (public.has_role(auth.uid(),'admin'));
create policy "roles admin delete" on public.user_roles for delete to authenticated using (public.has_role(auth.uid(),'admin'));

create table public.items (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  category text not null default 'عام',
  quantity integer not null default 0 check (quantity >= 0),
  unit text not null default 'قطعة',
  notes text,
  created_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
grant select, insert, update, delete on public.items to authenticated;
grant all on public.items to service_role;
alter table public.items enable row level security;
create policy "items read" on public.items for select to authenticated using (true);
create policy "items staff insert" on public.items for insert to authenticated with check (public.is_staff(auth.uid()));
create policy "items staff update" on public.items for update to authenticated using (public.is_staff(auth.uid()));
create policy "items admin delete" on public.items for delete to authenticated using (public.is_staff(auth.uid()));

create table public.requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid(),
  item_id uuid not null references public.items(id) on delete cascade,
  quantity integer not null check (quantity > 0),
  note text,
  status text not null default 'pending' check (status in ('pending','approved','rejected')),
  decided_by uuid,
  decided_at timestamptz,
  created_at timestamptz not null default now()
);
grant select, insert on public.requests to authenticated;
grant all on public.requests to service_role;
alter table public.requests enable row level security;
create policy "requests read" on public.requests for select to authenticated
  using (auth.uid() = user_id or public.is_staff(auth.uid()));
create policy "requests insert own" on public.requests for insert to authenticated
  with check (auth.uid() = user_id and status = 'pending');

create or replace function public.decide_request(_request_id uuid, _approve boolean)
returns void language plpgsql security definer set search_path = public
as $$
declare r public.requests;
begin
  if not public.is_staff(auth.uid()) then raise exception 'غير مسموح'; end if;
  select * into r from public.requests where id = _request_id for update;
  if r.id is null or r.status <> 'pending' then raise exception 'الطلب غير متاح'; end if;
  if _approve then
    update public.items set quantity = quantity - r.quantity, updated_at = now()
      where id = r.item_id and quantity >= r.quantity;
    if not found then raise exception 'الكمية في المخزن غير كافية'; end if;
  end if;
  update public.requests set status = case when _approve then 'approved' else 'rejected' end,
    decided_by = auth.uid(), decided_at = now() where id = _request_id;
end $$;
revoke execute on function public.decide_request(uuid, boolean) from public, anon;
grant execute on function public.decide_request(uuid, boolean) to authenticated;

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, email)
  values (new.id, coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', ''), new.email);
  if not exists (select 1 from public.user_roles where role = 'admin') then
    insert into public.user_roles (user_id, role) values (new.id, 'admin');
  else
    insert into public.user_roles (user_id, role) values (new.id, 'member');
  end if;
  return new;
end $$;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();