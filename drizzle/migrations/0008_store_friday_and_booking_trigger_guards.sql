create or replace function public.guard_store_friday() returns trigger language plpgsql set search_path=public as $$ begin
 if extract(isodow from now() at time zone 'Africa/Cairo')=5 then
  if TG_OP='INSERT' then raise exception 'STORE_FRIDAY_CLOSED'; end if;
  if new.status='completed' and old.status is distinct from new.status then raise exception 'STORE_FRIDAY_CLOSED'; end if;
 end if;
 return new;
end $$;
create trigger purchase_friday before insert or update on public.purchase_orders for each row execute function public.guard_store_friday();
create trigger legacy_friday before insert or update on public.shop_orders for each row execute function public.guard_store_friday();
-- Ensure validation runs when booking times change, not just item or quantity.
create trigger booking_times_validation before update of pickup_at,due_at,source on public.requests for each row execute function public.check_request_stock();
create or replace function public.adjust_equipment(_item uuid,_delta integer) returns void language plpgsql security definer set search_path=public as $$ begin
 if not public.is_staff(auth.uid()) then raise exception 'NOT_ALLOWED'; end if;
 update public.items set quantity=quantity+_delta,updated_at=now() where id=_item and quantity+_delta>=0;
 if not found then raise exception 'NOT_ENOUGH_STOCK'; end if;
end $$;
revoke all on function public.adjust_equipment(uuid,integer) from public,anon;
grant execute on function public.adjust_equipment(uuid,integer) to authenticated;