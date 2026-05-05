// 模拟 BLE 信标流量（开发期使用，方便前端立即看到真实数据流）
// POST /ble-simulate  body: { devices?: number, ttl_seconds?: number }
// 为景区 22 个景点生成一批 ping，按景点容量加权分布。
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS")
    return new Response(null, { headers: corsHeaders });

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  let body: { devices?: number } = {};
  try {
    body = (await req.json()) as { devices?: number };
  } catch { /* allow empty body */ }

  const devicesPerSpot = Math.min(Math.max(body.devices ?? 8, 1), 60);

  const { data: spots, error: e1 } = await supabase
    .from("spots")
    .select("id, capacity, category");
  if (e1 || !spots) {
    return new Response(
      JSON.stringify({ error: "spots_fetch_failed", message: e1?.message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }

  const rows: { device_id: string; spot_id: string; rssi: number }[] = [];
  const now = Date.now();
  for (const s of spots) {
    // 容量越大 → 当前波次人数越多；佛教朝圣/演艺 类景点权重稍高
    const weight =
      (s.category === "佛教朝圣" || s.category === "演艺") ? 1.4 : 1.0;
    const n = Math.max(
      1,
      Math.round((s.capacity / 80) * weight * (0.4 + Math.random() * 0.7) *
        (devicesPerSpot / 8)),
    );
    for (let i = 0; i < n; i++) {
      rows.push({
        device_id: `sim-${s.id}-${(now + i) % 10000}-${Math.floor(
          Math.random() * 1e6,
        )}`,
        spot_id: s.id,
        rssi: -40 - Math.floor(Math.random() * 50),
      });
    }
  }

  const { error: e2, count } = await supabase
    .from("ble_pings")
    .insert(rows, { count: "exact" });
  if (e2) {
    return new Response(
      JSON.stringify({ error: "insert_failed", message: e2.message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }

  return new Response(
    JSON.stringify({ ok: true, inserted: count ?? rows.length }),
    {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    },
  );
});
