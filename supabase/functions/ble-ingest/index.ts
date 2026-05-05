// BLE 信标上报接口
// POST /ble-ingest
//   单条:  { device_id: "uuid", spot_id: "LS-010", rssi?: -65 }
//   批量:  { pings: [ { device_id, spot_id, rssi? }, ... ] }
//
// 使用 service role 写入 ble_pings 表（绕过 RLS），并做基础校验与限速。
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { z } from "https://esm.sh/zod@3.23.8";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const PingSchema = z.object({
  device_id: z.string().min(3).max(80),
  spot_id: z.string().min(3).max(40),
  rssi: z.number().int().min(-120).max(0).optional(),
});
const BodySchema = z.union([
  PingSchema,
  z.object({ pings: z.array(PingSchema).min(1).max(500) }),
]);

// 简易内存限速：每 IP 每 10 秒最多 600 次请求
const bucket = new Map<string, { c: number; t: number }>();
function rateLimit(ip: string, limit = 600, windowMs = 10_000) {
  const now = Date.now();
  const b = bucket.get(ip);
  if (!b || now - b.t > windowMs) {
    bucket.set(ip, { c: 1, t: now });
    return true;
  }
  b.c += 1;
  return b.c <= limit;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "method_not_allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0].trim() ||
    req.headers.get("cf-connecting-ip") ||
    "unknown";
  if (!rateLimit(ip)) {
    return new Response(JSON.stringify({ error: "rate_limited" }), {
      status: 429,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: "invalid_json" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const parsed = BodySchema.safeParse(raw);
  if (!parsed.success) {
    return new Response(
      JSON.stringify({
        error: "validation_failed",
        details: parsed.error.flatten(),
      }),
      {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
  const pings =
    "pings" in parsed.data ? parsed.data.pings : [parsed.data];

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  const rows = pings.map((p) => ({
    device_id: p.device_id,
    spot_id: p.spot_id,
    rssi: p.rssi ?? null,
  }));

  const { error, count } = await supabase
    .from("ble_pings")
    .insert(rows, { count: "exact" });

  if (error) {
    console.error("insert ble_pings failed", error);
    return new Response(
      JSON.stringify({ error: "insert_failed", message: error.message }),
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
