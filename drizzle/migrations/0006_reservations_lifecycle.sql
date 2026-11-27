alter table public.requests drop constraint if exists requests_status_check;
alter table public.requests add constraint requests_status_check check (status in ('pending','approved','rejected','picked_up','returned','cancelled'));
alter table public.requests add column if not exists pickup_date date;
alter table public.requests add column if not exists return_date date;
alter table public.requests add column if not exists pickup_note text;
alter table public.requests add column if not exists return_note text;
alter table public.requests add column if not exists picked_up_at timestamptz;
alter table public.requests add column if not exists returned_at timestamptz;

create or replace function public.advance_request(_request_id uuid, _action text, _note text default null)
returns void language plpgsql security definer set search_path = public
as $$
declare r public.requests; staff boolean := public.is_staff(auth.uid());
begin
  select * into r from public.requests where id = _request_id for update;
  if r.id is null then raise exception 'REQUEST_NOT_FOUND'; end if;
  if _action = 'pickup' then
    if not staff or r.status <> 'approved' then raise exception 'NOT_ALLOWED'; end if;
    update public.requests set status = 'picked_up', picked_up_at = now(), pickup_note = _note where id = r.id;
  elsif _action = 'return' then
    if not staff or r.status <> 'picked_up' then raise exception 'NOT_ALLOWED'; end if;
    update public.items set quantity = quantity + r.quantity, updated_at = now() where id = r.item_id;
    update public.requests set status = 'returned', returned_at = now(), return_note = _note where id = r.id;
  elsif _action = 'cancel' then
    if r.status = 'pending' and (staff or r.user_id = auth.uid()) then
      update public.requests set status = 'cancelled' where id = r.id;
    elsif r.status = 'approved' and staff then
      update public.items set quantity = quantity + r.quantity, updated_at = now() where id = r.item_id;
      update public.requests set status = 'cancelled' where id = r.id;
    else raise exception 'NOT_ALLOWED'; end if;
  else raise exception 'BAD_ACTION'; end if;
end $$;
revoke execute on function public.advance_request(uuid, text, text) from public, anon;
grant execute on function public.advance_request(uuid, text, text) to authenticated;