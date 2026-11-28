import { queryOptions } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { nameMap } from '@/components/store/names';
export const reservationsQuery = queryOptions({ queryKey: ['requests'], queryFn: async () => {
  const { data, error } = await supabase.from('requests').select('*, items(name, unit, quantity)').order('created_at', { ascending: false });
  if (error) throw error;
  const names = await nameMap((data ?? []).map(r => r.user_id));
  return (data ?? []).map(r => ({ ...r, who: r.borrower_name || names.get(r.user_id) || '' }));
}});
export const scheduleQuery = queryOptions({ queryKey: ['booking-schedule'], queryFn: async () => {
  const { data, error } = await supabase.rpc('shared_booking_schedule');
  if (error) throw error;
  return data ?? [];
}});
export const equipmentQuery = queryOptions({queryKey: ['items'], queryFn: async () => {
  const {data,error}=await supabase.from('items').select('*').order('name'); if(error) throw error; return data ?? [];
}});
export const purchasesQuery = queryOptions({queryKey: ['purchases'], queryFn: async () => {
  const {data,error}=await supabase.from('purchase_orders').select('*, purchase_order_lines(*)').order('created_at',{ascending:false}); if(error) throw error;
  const names=await nameMap((data ?? []).map(o=>o.user_id)); return (data ?? []).map(o=>({...o,who:names.get(o.user_id) ?? ''}));
}});
