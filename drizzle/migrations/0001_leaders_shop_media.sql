alter table public.items add column image_url text;

create table public.leaders (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  phone text,
  title text,
  image_url text,
  is_current boolean not null default false,
  created_at timestamptz not null default now()
);
grant select, insert, update, delete on public.leaders to authenticated;
grant all on public.leaders to service_role;
alter table public.leaders enable row level security;
create policy "leaders read" on public.leaders for select to authenticated using (true);
create policy "leaders staff insert" on public.leaders for insert to authenticated with check (public.is_staff(auth.uid()));
create policy "leaders staff update" on public.leaders for update to authenticated using (public.is_staff(auth.uid()));
create policy "leaders staff delete" on public.leaders for delete to authenticated using (public.is_staff(auth.uid()));

create table public.duty_shifts (
  id uuid primary key default gen_random_uuid(),
  leader_id uuid not null references public.leaders(id) on delete cascade,
  duty_date date not null,
  start_time time,
  end_time time,
  notes text,
  created_at timestamptz not null default now()
);
grant select, insert, update, delete on public.duty_shifts to authenticated;
grant all on public.duty_shifts to service_role;
alter table public.duty_shifts enable row level security;
create policy "shifts read" on public.duty_shifts for select to authenticated using (true);
create policy "shifts staff insert" on public.duty_shifts for insert to authenticated with check (public.is_staff(auth.uid()));
create policy "shifts staff update" on public.duty_shifts for update to authenticated using (public.is_staff(auth.uid()));
create policy "shifts staff delete" on public.duty_shifts for delete to authenticated using (public.is_staff(auth.uid()));

create table public.products (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  price numeric(10,2) not null default 0 check (price >= 0),
  stock integer not null default 0 check (stock >= 0),
  image_url text,
  created_at timestamptz not null default now()
);
grant select, insert, update, delete on public.products to authenticated;
grant all on public.products to service_role;
alter table public.products enable row level security;
create policy "products read" on public.products for select to authenticated using (true);
create policy "products staff insert" on public.products for insert to authenticated with check (public.is_staff(auth.uid()));
create policy "products staff update" on public.products for update to authenticated using (public.is_staff(auth.uid()));
create policy "products staff delete" on public.products for delete to authenticated using (public.is_staff(auth.uid()));

create table public.shop_orders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid(),
  product_id uuid not null references public.products(id) on delete cascade,
  quantity integer not null check (quantity > 0),
  status text not null default 'pending' check (status in ('pending','completed','cancelled')),
  created_at timestamptz not null default now()
);
grant select, insert on public.shop_orders to authenticated;
grant all on public.shop_orders to service_role;
alter table public.shop_orders enable row level security;
create policy "orders read" on public.shop_orders for select to authenticated using (auth.uid() = user_id or public.is_staff(auth.uid()));
create policy "orders insert own" on public.shop_orders for insert to authenticated with check (auth.uid() = user_id and status = 'pending');

create or replace function public.decide_order(_order_id uuid, _complete boolean)
returns void language plpgsql security definer set search_path = public
as $$
declare o public.shop_orders;
begin
  if not public.is_staff(auth.uid()) then raise exception 'not allowed'; end if;
  select * into o from public.shop_orders where id = _order_id for update;
  if o.id is null or o.status <> 'pending' then raise exception 'order not available'; end if;
  if _complete then
    update public.products set stock = stock - o.quantity where id = o.product_id and stock >= o.quantity;
    if not found then raise exception 'not enough stock'; end if;
  end if;
  update public.shop_orders set status = case when _complete then 'completed' else 'cancelled' end where id = _order_id;
end $$;
revoke execute on function public.decide_order(uuid, boolean) from public, anon;
grant execute on function public.decide_order(uuid, boolean) to authenticated;

create table public.site_settings (
  id int primary key default 1 check (id = 1),
  logo_url text,
  updated_at timestamptz not null default now()
);
grant select on public.site_settings to anon;
grant select, insert, update on public.site_settings to authenticated;
grant all on public.site_settings to service_role;
alter table public.site_settings enable row level security;
create policy "settings public read" on public.site_settings for select to anon, authenticated using (true);
create policy "settings staff insert" on public.site_settings for insert to authenticated with check (public.is_staff(auth.uid()));
create policy "settings staff update" on public.site_settings for update to authenticated using (public.is_staff(auth.uid()));
insert into public.site_settings (id) values (1);