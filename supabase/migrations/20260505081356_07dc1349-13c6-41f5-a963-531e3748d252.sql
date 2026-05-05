-- ========== 景点表 ==========
create table if not exists public.spots (
  id text primary key,                     -- LS-001 / NHW-01
  name text not null,
  lng double precision not null,
  lat double precision not null,
  zone text not null default '灵山胜境',    -- 灵山胜境 / 拈花湾
  category text not null default '其他',    -- 佛教朝圣 / 自然景观 / 禅意体验 / 演艺 / 服务
  capacity int not null default 1000,
  created_at timestamptz not null default now()
);

alter table public.spots enable row level security;

create policy "spots_public_read" on public.spots
  for select using (true);

-- ========== BLE 上报记录 ==========
create table if not exists public.ble_pings (
  id bigserial primary key,
  device_id text not null,                 -- 游客设备/手环唯一 ID
  spot_id text not null references public.spots(id) on delete cascade,
  rssi int,                                -- 信号强度 (-100 ~ 0)，可为空
  recorded_at timestamptz not null default now()
);

create index if not exists ble_pings_recorded_idx
  on public.ble_pings (recorded_at desc);
create index if not exists ble_pings_spot_recorded_idx
  on public.ble_pings (spot_id, recorded_at desc);

alter table public.ble_pings enable row level security;

-- 公开写入（BLE 信标网关无身份），通过 Edge Function 校验
create policy "ble_pings_public_insert" on public.ble_pings
  for insert with check (true);

-- 仅认证用户（管理员）可读详情
create policy "ble_pings_auth_read" on public.ble_pings
  for select using (auth.uid() is not null);

-- ========== 实时聚合视图 ==========
-- 60s 滑动窗口内每个景点的去重人数 + 最近上报时间
create or replace view public.spot_traffic_live as
select
  s.id,
  s.name,
  s.lng,
  s.lat,
  s.zone,
  s.category,
  s.capacity,
  coalesce(t.count, 0)::int  as count,
  t.last_seen
from public.spots s
left join lateral (
  select count(distinct p.device_id)::int as count,
         max(p.recorded_at) as last_seen
  from public.ble_pings p
  where p.spot_id = s.id
    and p.recorded_at > now() - interval '60 seconds'
) t on true;

grant select on public.spot_traffic_live to anon, authenticated;

-- ========== 上报函数 (RPC) ==========
create or replace function public.record_ping(
  _device_id text,
  _spot_id text,
  _rssi int default null
)
returns bigint
language plpgsql
security definer
set search_path = public
as $$
declare
  new_id bigint;
begin
  if _device_id is null or length(_device_id) < 3 then
    raise exception 'invalid device_id';
  end if;
  if _spot_id is null or not exists (select 1 from public.spots where id = _spot_id) then
    raise exception 'unknown spot_id: %', _spot_id;
  end if;

  insert into public.ble_pings (device_id, spot_id, rssi)
  values (_device_id, _spot_id, _rssi)
  returning id into new_id;

  return new_id;
end;
$$;

grant execute on function public.record_ping(text, text, int) to anon, authenticated;

-- ========== 种子数据：灵山胜境 + 拈花湾 ==========
insert into public.spots (id, name, lng, lat, zone, category, capacity) values
  ('LS-001','灵山大照壁',  120.0905, 31.4480, '灵山胜境', '佛教朝圣', 600),
  ('LS-002','五明桥',      120.0908, 31.4470, '灵山胜境', '佛教朝圣', 400),
  ('LS-003','胜境门楼',    120.0910, 31.4462, '灵山胜境', '佛教朝圣', 500),
  ('LS-004','洗心池',      120.0912, 31.4455, '灵山胜境', '禅意体验', 300),
  ('LS-005','五智门',      120.0914, 31.4448, '灵山胜境', '佛教朝圣', 400),
  ('LS-006','九龙灌浴',    120.0918, 31.4440, '灵山胜境', '演艺',     900),
  ('LS-007','降魔成道',    120.0922, 31.4432, '灵山胜境', '演艺',     500),
  ('LS-008','阿育王柱',    120.0925, 31.4425, '灵山胜境', '佛教朝圣', 300),
  ('LS-009','祥符禅寺',    120.0930, 31.4418, '灵山胜境', '佛教朝圣', 800),
  ('LS-010','灵山大佛',    120.0938, 31.4408, '灵山胜境', '佛教朝圣', 1500),
  ('LS-011','百子戏弥勒',  120.0928, 31.4413, '灵山胜境', '佛教朝圣', 500),
  ('LS-012','万佛殿',      120.0942, 31.4402, '灵山胜境', '佛教朝圣', 700),
  ('LS-013','梵宫',        120.0895, 31.4435, '灵山胜境', '演艺',     1200),
  ('LS-014','五印坛城',    120.0875, 31.4448, '灵山胜境', '佛教朝圣', 600),
  ('LS-015','曼飞龙塔',    120.0868, 31.4452, '灵山胜境', '自然景观', 200),
  ('LS-016','无尽意斋',    120.0915, 31.4395, '灵山胜境', '禅意体验', 150),
  ('NHW-01','拈花湾入口',  120.0838, 31.4470, '拈花湾',   '服务',     800),
  ('NHW-02','香月花街',    120.0830, 31.4460, '拈花湾',   '禅意体验', 1000),
  ('NHW-03','拈花塔',      120.0822, 31.4452, '拈花湾',   '演艺',     800),
  ('NHW-04','五灯湖',      120.0828, 31.4445, '拈花湾',   '自然景观', 600),
  ('NHW-05','鹿鸣谷',      120.0840, 31.4438, '拈花湾',   '自然景观', 300),
  ('NHW-06','波罗蜜广场',  120.0832, 31.4475, '拈花湾',   '禅意体验', 500)
on conflict (id) do update set
  name = excluded.name,
  lng = excluded.lng,
  lat = excluded.lat,
  zone = excluded.zone,
  category = excluded.category,
  capacity = excluded.capacity;