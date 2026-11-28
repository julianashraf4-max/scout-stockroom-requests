alter table public.requests add column pickup_at timestamptz;
alter table public.requests add column due_at timestamptz;
alter table public.requests add column source text not null default 'website';
alter table public.requests add column borrower_name text;
-- Previous approval deducted on-hand stock. Restore only approved, not picked-up, equipment.
update public.items i set quantity = i.quantity + coalesce((select sum(r.quantity) from public.requests r where r.item_id=i.id and r.status='approved'),0);
update public.requests set pickup_at = (coalesce(pickup_date,created_at::date)::timestamp at time zone 'Africa/Cairo'), due_at = ((coalesce(return_date,pickup_date,created_at::date)+1)::timestamp at time zone 'Africa/Cairo');
create index requests_booking_idx on public.requests(item_id,status,pickup_at,due_at);

create or replace function public.booking_available(_item uuid, _start timestamptz, _end timestamptz, _exclude uuid default null)
returns integer language plpgsql security definer set search_path=public as $$
declare capacity integer; peak integer;
begin
 select i.quantity + coalesce((select sum(quantity) from public.requests where item_id=i.id and status='picked_up'),0) into capacity from public.items i where i.id=_item;
 if capacity is null then raise exception 'ITEM_NOT_FOUND'; end if;
 with held as (
 select quantity, pickup_at as s, case when status='picked_up' and due_at < now() then 'infinity'::timestamptz else due_at end as e
 from public.requests where item_id=_item and status in ('pending','approved','picked_up') and id is distinct from _exclude
 ), points as (select _start as t union select s from held where s>=_start and s<_end)
 select coalesce(max((select coalesce(sum(quantity),0) from held where s<=p.t and e>p.t)),0) into peak from points p;
 return greatest(0,capacity-peak);
end $$;
revoke all on function public.booking_available(uuid,timestamptz,timestamptz,uuid) from public,anon;
grant execute on function public.booking_available(uuid,timestamptz,timestamptz,uuid) to authenticated;

create or replace function public.check_request_stock() returns trigger language plpgsql security definer set search_path=public as $$
begin
 if TG_OP='UPDATE' then
  if new.item_id is not distinct from old.item_id and new.quantity is not distinct from old.quantity and new.pickup_at is not distinct from old.pickup_at and new.due_at is not distinct from old.due_at then return new; end if;
 end if;
 if new.quantity is null or new.quantity<=0 then raise exception 'INVALID_REQUEST_QUANTITY'; end if;
 if new.source='external' then
  if not public.is_staff(auth.uid()) or new.status<>'picked_up' then raise exception 'NOT_ALLOWED'; end if;
 else
  if new.status<>'pending' or new.source<>'website' then raise exception 'NOT_ALLOWED'; end if;
  if new.pickup_at is null or new.pickup_at < now()+interval '24 hours' then raise exception 'ADVANCE_24_HOURS'; end if;
 end if;
 if new.due_at is null or new.due_at<=new.pickup_at then raise exception 'INVALID_DATES'; end if;
 perform 1 from public.items where id=new.item_id for update;
 if public.booking_available(new.item_id,new.pickup_at,new.due_at,new.id)<new.quantity then raise exception 'NOT_ENOUGH_STOCK'; end if;
 return new;
end $$;

create or replace function public.decide_request(_request_id uuid,_approve boolean) returns void language plpgsql security definer set search_path=public as $$
declare r public.requests;
begin
 if not public.is_staff(auth.uid()) then raise exception 'NOT_ALLOWED'; end if;
 select * into r from public.requests where id=_request_id for update;
 if r.id is null or r.status<>'pending' then raise exception 'INVALID_STATUS'; end if;
 perform 1 from public.items where id=r.item_id for update;
 if _approve and public.booking_available(r.item_id,greatest(r.pickup_at,now()),greatest(r.due_at,now()+interval '1 second'),r.id)<r.quantity then raise exception 'NOT_ENOUGH_STOCK'; end if;
 update public.requests set status=case when _approve then 'approved' else 'rejected' end,decided_by=auth.uid(),decided_at=now() where id=r.id;
end $$;

create table public.reservation_events(id uuid primary key default gen_random_uuid(), request_id uuid not null references public.requests(id), action text not null, note text, actor_id uuid not null default auth.uid(), created_at timestamptz not null default now());
grant select on public.reservation_events to authenticated;
grant all on public.reservation_events to service_role;
alter table public.reservation_events enable row level security;
create policy "events owner or staff read" on public.reservation_events for select to authenticated using (public.is_staff(auth.uid()) or exists(select 1 from public.requests r where r.id=request_id and r.user_id=auth.uid()));

create or replace function public.advance_request(_request_id uuid,_action text,_note text default null) returns void language plpgsql security definer set search_path=public as $$
declare r public.requests; staff boolean:=public.is_staff(auth.uid());
begin
 select * into r from public.requests where id=_request_id for update;
 if r.id is null then raise exception 'REQUEST_NOT_FOUND'; end if;
 perform 1 from public.items where id=r.item_id for update;
 if _action='pickup' then
  if not staff or r.status<>'approved' then raise exception 'NOT_ALLOWED'; end if;
  if now()<r.pickup_at then raise exception 'PICKUP_NOT_DUE'; end if;
  update public.items set quantity=quantity-r.quantity,updated_at=now() where id=r.item_id and quantity>=r.quantity;
  if not found then raise exception 'NOT_ENOUGH_STOCK'; end if;
  update public.requests set status='picked_up',picked_up_at=now(),pickup_note=_note where id=r.id;
 elsif _action='return' then
  if not staff or r.status<>'picked_up' then raise exception 'NOT_ALLOWED'; end if;
  update public.items set quantity=quantity+r.quantity,updated_at=now() where id=r.item_id;
  update public.requests set status='returned',returned_at=now(),return_note=_note where id=r.id;
 elsif _action='cancel' then
  if not ((r.status='pending' and (staff or r.user_id=auth.uid())) or (r.status='approved' and staff)) then raise exception 'NOT_ALLOWED'; end if;
  update public.requests set status='cancelled' where id=r.id;
 elsif _action='note' then
  if not staff or nullif(trim(_note),'') is null then raise exception 'NOT_ALLOWED'; end if;
 else raise exception 'BAD_ACTION'; end if;
 insert into public.reservation_events(request_id,action,note) values(r.id,_action,_note);
end $$;

create or replace function public.issue_external(_item uuid,_quantity integer,_borrower text,_due timestamptz,_note text) returns uuid language plpgsql security definer set search_path=public as $$
declare rid uuid;
begin
 if not public.is_staff(auth.uid()) then raise exception 'NOT_ALLOWED'; end if;
 if nullif(trim(_borrower),'') is null or nullif(trim(_note),'') is null then raise exception 'NOTE_REQUIRED'; end if;
 perform 1 from public.items where id=_item for update;
 insert into public.requests(item_id,quantity,user_id,status,pickup_at,due_at,pickup_date,return_date,source,borrower_name,note,pickup_note,picked_up_at)
 values(_item,_quantity,auth.uid(),'picked_up',now(),_due,(now() at time zone 'Africa/Cairo')::date,(_due at time zone 'Africa/Cairo')::date,'external',_borrower,_note,_note,now()) returning id into rid;
 update public.items set quantity=quantity-_quantity,updated_at=now() where id=_item and quantity>=_quantity;
 if not found then raise exception 'NOT_ENOUGH_STOCK'; end if;
 insert into public.reservation_events(request_id,action,note) values(rid,'pickup',_note);
 return rid;
end $$;
revoke all on function public.issue_external(uuid,integer,text,timestamptz,text) from public,anon;
grant execute on function public.issue_external(uuid,integer,text,timestamptz,text) to authenticated;

create or replace function public.shared_booking_schedule() returns table(id uuid,item_name text,quantity integer,pickup_at timestamptz,due_at timestamptz,status text,source text) language sql stable security definer set search_path=public as $$
 select r.id,i.name,r.quantity,r.pickup_at,r.due_at,r.status,r.source from public.requests r join public.items i on i.id=r.item_id where auth.uid() is not null and r.status in ('pending','approved','picked_up','returned') order by r.pickup_at;
$$;
revoke all on function public.shared_booking_schedule() from public,anon;
grant execute on function public.shared_booking_schedule() to authenticated;

create table public.cart_items(user_id uuid not null default auth.uid(),product_id uuid not null references public.products(id),quantity integer not null check(quantity>0),primary key(user_id,product_id));
grant select,insert,update,delete on public.cart_items to authenticated;
grant all on public.cart_items to service_role;
alter table public.cart_items enable row level security;
create policy "cart own" on public.cart_items for all to authenticated using(user_id=auth.uid()) with check(user_id=auth.uid());
create table public.purchase_orders(id uuid primary key default gen_random_uuid(),user_id uuid not null default auth.uid(),status text not null default 'pending' check(status in ('pending','completed','cancelled')),total numeric not null default 0,note text,decided_by uuid,decided_at timestamptz,created_at timestamptz not null default now());
grant select on public.purchase_orders to authenticated;
grant all on public.purchase_orders to service_role;
alter table public.purchase_orders enable row level security;
create policy "purchases own or staff" on public.purchase_orders for select to authenticated using(user_id=auth.uid() or public.is_staff(auth.uid()));
create table public.purchase_order_lines(id uuid primary key default gen_random_uuid(),order_id uuid not null references public.purchase_orders(id),product_id uuid not null references public.products(id),product_name text not null,quantity integer not null check(quantity>0),unit_price numeric not null check(unit_price>=0));
grant select on public.purchase_order_lines to authenticated;
grant all on public.purchase_order_lines to service_role;
alter table public.purchase_order_lines enable row level security;
create policy "purchase lines own or staff" on public.purchase_order_lines for select to authenticated using(exists(select 1 from public.purchase_orders o where o.id=order_id and (o.user_id=auth.uid() or public.is_staff(auth.uid()))));

create or replace function public.product_available(_product uuid) returns integer language sql stable security definer set search_path=public as $$
 select greatest(0,p.stock-coalesce((select sum(l.quantity) from public.purchase_order_lines l join public.purchase_orders o on o.id=l.order_id where l.product_id=p.id and o.status='pending'),0)-coalesce((select sum(quantity) from public.shop_orders where product_id=p.id and status='pending'),0))::integer from public.products p where p.id=_product;
$$;
revoke all on function public.product_available(uuid) from public,anon;
grant execute on function public.product_available(uuid) to authenticated;
create or replace function public.shop_availability() returns table(product_id uuid,available integer) language sql stable security definer set search_path=public as $$ select id,public.product_available(id) from public.products where auth.uid() is not null $$;
revoke all on function public.shop_availability() from public,anon;
grant execute on function public.shop_availability() to authenticated;

create or replace function public.checkout_cart(_note text default null) returns uuid language plpgsql security definer set search_path=public as $$
declare oid uuid; c record; n integer:=0;
begin
 if auth.uid() is null then raise exception 'NOT_ALLOWED'; end if;
 perform pg_advisory_xact_lock(hashtextextended(auth.uid()::text,0));
 perform 1 from public.cart_items where user_id=auth.uid() order by product_id for update;
 if not exists(select 1 from public.cart_items where user_id=auth.uid()) then raise exception 'EMPTY_CART'; end if;
 perform 1 from public.products where id in(select product_id from public.cart_items where user_id=auth.uid()) order by id for update;
 for c in select * from public.cart_items where user_id=auth.uid() loop
  if public.product_available(c.product_id)<c.quantity then raise exception 'NOT_ENOUGH_STOCK'; end if;
 end loop;
 insert into public.purchase_orders(user_id,note) values(auth.uid(),_note) returning id into oid;
 insert into public.purchase_order_lines(order_id,product_id,product_name,quantity,unit_price) select oid,p.id,p.name,c.quantity,p.price from public.cart_items c join public.products p on p.id=c.product_id where c.user_id=auth.uid();
 update public.purchase_orders set total=(select sum(quantity*unit_price) from public.purchase_order_lines where order_id=oid) where id=oid;
 delete from public.cart_items where user_id=auth.uid();
 return oid;
end $$;
revoke all on function public.checkout_cart(text) from public,anon;
grant execute on function public.checkout_cart(text) to authenticated;
create or replace function public.decide_purchase(_order uuid,_complete boolean,_note text default null) returns void language plpgsql security definer set search_path=public as $$
declare o public.purchase_orders; l record;
begin
 select * into o from public.purchase_orders where id=_order for update;
 if o.id is null or o.status<>'pending' then raise exception 'INVALID_STATUS'; end if;
 if not public.is_staff(auth.uid()) and not (not _complete and o.user_id=auth.uid()) then raise exception 'NOT_ALLOWED'; end if;
 perform 1 from public.products where id in(select product_id from public.purchase_order_lines where order_id=o.id) order by id for update;
 -- Release held quantities within this transaction, then deliver atomically.
 update public.purchase_orders set status=case when _complete then 'completed' else 'cancelled' end,decided_by=auth.uid(),decided_at=now(),note=coalesce(_note,note) where id=o.id;
 if _complete then
  for l in select * from public.purchase_order_lines where order_id=o.id loop
   update public.products set stock=stock-l.quantity where id=l.product_id and stock>=l.quantity;
   if not found then raise exception 'NOT_ENOUGH_STOCK'; end if;
  end loop;
 end if;
end $$;
revoke all on function public.decide_purchase(uuid,boolean,text) from public,anon;
grant execute on function public.decide_purchase(uuid,boolean,text) to authenticated;

create or replace function public.guard_product_stock() returns trigger language plpgsql security definer set search_path=public as $$
declare held integer;
begin
 select coalesce(sum(l.quantity),0) into held from public.purchase_order_lines l join public.purchase_orders o on o.id=l.order_id where l.product_id=new.id and o.status='pending';
 held:=held+coalesce((select sum(quantity) from public.shop_orders where product_id=new.id and status='pending'),0);
 if new.stock<held or new.stock<0 or new.price<0 then raise exception 'NOT_ENOUGH_STOCK'; end if;
 return new;
end $$;
create trigger guard_product_stock before insert or update on public.products for each row execute function public.guard_product_stock();
create or replace function public.validate_legacy_order() returns trigger language plpgsql security definer set search_path=public as $$ begin
 if TG_OP='INSERT' then
  perform 1 from public.products where id=new.product_id for update;
  if new.quantity<=0 or public.product_available(new.product_id)<new.quantity then raise exception 'NOT_ENOUGH_STOCK'; end if;
 end if; return new;
end $$;
create trigger validate_legacy_order before insert on public.shop_orders for each row execute function public.validate_legacy_order();
create or replace function public.decide_order(_order_id uuid,_complete boolean) returns void language plpgsql security definer set search_path=public as $$ declare o public.shop_orders; begin
 if not public.is_staff(auth.uid()) then raise exception 'NOT_ALLOWED'; end if;
 select * into o from public.shop_orders where id=_order_id for update;
 if o.id is null or o.status<>'pending' then raise exception 'INVALID_STATUS'; end if;
 perform 1 from public.products where id=o.product_id for update;
 update public.shop_orders set status=case when _complete then 'completed' else 'cancelled' end where id=o.id;
 if _complete then update public.products set stock=stock-o.quantity where id=o.product_id and stock>=o.quantity; if not found then raise exception 'NOT_ENOUGH_STOCK'; end if; end if;
end $$;

create table public.administrative_notes(id uuid primary key default gen_random_uuid(),note text not null,created_by uuid not null default auth.uid(),created_at timestamptz not null default now());
grant select,insert,update,delete on public.administrative_notes to authenticated;
grant all on public.administrative_notes to service_role;
alter table public.administrative_notes enable row level security;
create policy "staff notes" on public.administrative_notes for all to authenticated using(public.is_staff(auth.uid())) with check(public.is_staff(auth.uid()));