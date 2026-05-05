-- 1) 视图改为 invoker
alter view public.spot_traffic_live set (security_invoker = true);

-- 2) 移除公开 insert 策略：BLE 上报只能通过 Edge Function (service role)
drop policy if exists "ble_pings_public_insert" on public.ble_pings;

-- 3) 收回 record_ping 公开执行权限
revoke execute on function public.record_ping(text, text, int) from anon, authenticated, public;