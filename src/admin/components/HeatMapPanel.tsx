import { useEffect, useRef, useState, useCallback } from "react";
import {
  Layers, MapPin, Flame, Eye, EyeOff, Crosshair,
  Wifi, WifiOff, Radio, Loader2, Globe, Map as MapIcon,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

const AMAP_KEY =
  (import.meta.env.VITE_AMAP_KEY as string) ||
  "8a89d20b7f2d4a90ca361d2f56a59186";
const AMAP_SECURITY_CODE =
  (import.meta.env.VITE_AMAP_SECURITY_CODE as string) || "";

const CENTER: [number, number] = [120.0894, 31.4445];

const SCENIC_BOUNDARY: [number, number][] = [
  [120.0820, 31.4500], [120.0865, 31.4520], [120.0935, 31.4515],
  [120.0980, 31.4480], [120.0985, 31.4430], [120.0960, 31.4385],
  [120.0905, 31.4365], [120.0850, 31.4380], [120.0815, 31.4425],
  [120.0820, 31.4500],
];

interface LiveSpot {
  id: string;
  name: string;
  lng: number;
  lat: number;
  zone: string;
  category: string;
  capacity: number;
  count: number;
  last_seen: string | null;
}

function expandHeat(spots: LiveSpot[]) {
  const data: { lng: number; lat: number; count: number }[] = [];
  for (const s of spots) {
    if (s.count <= 0) continue;
    data.push({ lng: s.lng, lat: s.lat, count: s.count });
    const ring = Math.max(3, Math.round(s.count / 80));
    for (let i = 0; i < ring; i++) {
      const a = (Math.PI * 2 * i) / ring;
      const r = 0.0008 + (i % 3) * 0.0003;
      data.push({
        lng: s.lng + Math.cos(a) * r,
        lat: s.lat + Math.sin(a) * r,
        count: Math.round(s.count * (0.35 + ((i * 17) % 35) / 100)),
      });
    }
  }
  return data;
}

declare global {
  interface Window {
    AMap: any;
    _AMapSecurityConfig: any;
  }
}

let amapLoadPromise: Promise<any> | null = null;
function loadAMap(): Promise<any> {
  if (window.AMap) return Promise.resolve(window.AMap);
  if (amapLoadPromise) return amapLoadPromise;
  amapLoadPromise = new Promise((resolve, reject) => {
    if (AMAP_SECURITY_CODE) {
      window._AMapSecurityConfig = { securityJsCode: AMAP_SECURITY_CODE };
    }
    const s = document.createElement("script");
    s.src = `https://webapi.amap.com/maps?v=2.0&key=${AMAP_KEY}&plugin=AMap.HeatMap,AMap.Scale,AMap.TileLayer.Satellite,AMap.TileLayer.RoadNet`;
    s.async = true;
    s.onload = () => resolve(window.AMap);
    s.onerror = () => reject(new Error("AMap script load failed"));
    document.head.appendChild(s);
  });
  return amapLoadPromise;
}

const CATEGORY_COLOR: Record<string, string> = {
  佛教朝圣: "#f59e0b",
  自然景观: "#34d399",
  禅意体验: "#60a5fa",
  演艺:     "#f472b6",
  服务:     "#a78bfa",
  其他:     "#9ca3af",
};

const POLL_INTERVAL_MS = 5_000;

export default function HeatMapPanel() {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const heatRef = useRef<any>(null);
  const markersRef = useRef<any[]>([]);
  const polygonRef = useRef<any>(null);
  const satelliteRef = useRef<any>(null);
  const roadNetRef = useRef<any>(null);

  const [error, setError] = useState<string | null>(null);
  const [showHeat, setShowHeat] = useState(true);
  const [showMarkers, setShowMarkers] = useState(true);
  const [mapType, setMapType] = useState<"standard" | "satellite">("satellite");

  const [spots, setSpots] = useState<LiveSpot[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastFetchAt, setLastFetchAt] = useState<number | null>(null);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [simulating, setSimulating] = useState(false);

  // === 拉取实时人流 ===
  const fetchLive = useCallback(async () => {
    const { data, error } = await supabase
      .from("spot_traffic_live")
      .select("*")
      .order("count", { ascending: false });
    if (error) {
      setFetchError(error.message);
      return;
    }
    setFetchError(null);
    setLastFetchAt(Date.now());
    setSpots((data ?? []) as LiveSpot[]);
    setLoading(false);
  }, []);

  // 5秒轮询
  useEffect(() => {
    fetchLive();
    const t = setInterval(fetchLive, POLL_INTERVAL_MS);
    return () => clearInterval(t);
  }, [fetchLive]);

  // === 初始化地图 ===
  useEffect(() => {
    let disposed = false;
    loadAMap()
      .then((AMap) => {
        if (disposed || !containerRef.current) return;
        const map = new AMap.Map(containerRef.current, {
          zoom: 15.4,
          center: CENTER,
          // 高德官方"清新版"标准底图：植被绿、建筑灰白、路网清晰，与景区导览图一致
          mapStyle: "amap://styles/fresh",
          viewMode: "2D",
          // 打开完整图层：背景/道路/建筑/POI 点（POI 才会显示"灵山大佛""梵宫"等名称）
          features: ["bg", "road", "building", "point"],
          showLabel: true,
          rotateEnable: false,
          pitchEnable: false,
        });
        mapRef.current = map;
        map.addControl(new AMap.Scale({ position: "LB" }));

        // 默认叠加卫星 + 路网图层（灵山胜境真实卫星影像 + 路名）
        AMap.plugin(["AMap.TileLayer.Satellite", "AMap.TileLayer.RoadNet"], () => {
          if (disposed) return;
          satelliteRef.current = new AMap.TileLayer.Satellite();
          roadNetRef.current = new AMap.TileLayer.RoadNet();
          map.add([satelliteRef.current, roadNetRef.current]);
        });

        // 景区围栏：浅底图上用更深的蓝色虚线 + 极淡填充，模拟截区效果
        const polygon = new AMap.Polygon({
          path: SCENIC_BOUNDARY,
          strokeColor: "#2563eb",
          strokeWeight: 2,
          strokeOpacity: 0.85,
          fillColor: "#3b82f6",
          fillOpacity: 0.05,
          strokeStyle: "dashed",
          strokeDasharray: [8, 6],
        });
        polygon.setMap(map);
        polygonRef.current = polygon;

        const label = new AMap.Text({
          text: "灵山胜境 · 寻觅",
          position: CENTER,
          offset: new AMap.Pixel(0, -8),
          style: {
            background: "rgba(255,255,255,0.92)",
            border: "1px solid rgba(37,99,235,0.35)",
            color: "#1e3a8a",
            padding: "4px 10px",
            borderRadius: "999px",
            fontSize: "11px",
            letterSpacing: "2px",
            boxShadow: "0 2px 8px rgba(15,23,42,0.12)",
          },
        });
        label.setMap(map);

        AMap.plugin(["AMap.HeatMap"], () => {
          if (disposed) return;
          const heatmap = new AMap.HeatMap(map, {
            radius: 50,
            // 降低整体不透明度，保证下方地图（道路、建筑、POI）看得清楚
            opacity: [0, 0.65],
            gradient: {
              0.2: "rgba(56,189,248,0.45)",
              0.4: "rgba(132,204,22,0.6)",
              0.6: "rgba(250,204,21,0.75)",
              0.8: "rgba(249,115,22,0.85)",
              1.0: "rgba(220,38,38,0.95)",
            },
          });
          heatRef.current = heatmap;
        });
      })
      .catch((e) => setError(e.message));

    return () => {
      disposed = true;
      try {
        markersRef.current.forEach((m) => m.setMap(null));
        polygonRef.current?.setMap?.(null);
        mapRef.current?.destroy?.();
      } catch { /* noop */ }
      markersRef.current = [];
      mapRef.current = null;
      heatRef.current = null;
    };
  }, []);

  // === 数据变化时刷新热力 + 标记 ===
  useEffect(() => {
    const AMap = window.AMap;
    const map = mapRef.current;
    if (!AMap || !map || spots.length === 0) return;

    if (heatRef.current) {
      const max = Math.max(50, ...spots.map((s) => s.count));
      heatRef.current.setDataSet({ data: expandHeat(spots), max });
    }

    markersRef.current.forEach((m) => m.setMap(null));
    markersRef.current = [];
    if (!showMarkers) return;

    spots.forEach((s) => {
      const color = CATEGORY_COLOR[s.category] ?? CATEGORY_COLOR["其他"];
      const isHot = s.count > 0;
      // 高德同款红色水滴 pin（SVG），底部尖端对齐坐标点
      const pinColor = isHot ? "#e11d48" : "#94a3b8";
      const dom = document.createElement("div");
      dom.innerHTML = `
        <div style="position:relative;transform:translate(-50%,-100%);">
          <svg width="28" height="36" viewBox="0 0 28 36" style="display:block;filter:drop-shadow(0 2px 4px rgba(0,0,0,0.35));${isHot ? "animation: heat-ping 2.4s ease-out infinite;transform-origin:50% 100%;" : ""}">
            <path d="M14 0C6.27 0 0 6.05 0 13.52 0 23.6 14 36 14 36s14-12.4 14-22.48C28 6.05 21.73 0 14 0z" fill="${pinColor}" stroke="#ffffff" stroke-width="1.5"/>
            <circle cx="14" cy="13.5" r="5" fill="#ffffff"/>
            <circle cx="14" cy="13.5" r="2.6" fill="${pinColor}"/>
          </svg>
          <div style="
            position:absolute;top:0;left:50%;transform:translate(-50%,-110%);
            white-space:nowrap;font-size:11px;color:#0f172a;font-weight:500;
            background:rgba(255,255,255,0.95);padding:2px 8px;border-radius:10px;
            border:1px solid rgba(15,23,42,0.08);box-shadow:0 2px 6px rgba(15,23,42,0.12);
            letter-spacing:0.5px;
          ">
            <span style="color:${color};">●</span> ${s.name}
            <span style="color:${pinColor};font-weight:600;margin-left:4px;">${s.count}</span>
          </div>
        </div>`;
      const marker = new AMap.Marker({
        position: [s.lng, s.lat],
        content: dom,
        anchor: "bottom-center",
        zIndex: 200,
      });
      marker.setMap(map);
      markersRef.current.push(marker);
    });
  }, [spots, showMarkers]);

  const toggleHeat = () => {
    if (!heatRef.current) return;
    showHeat ? heatRef.current.hide() : heatRef.current.show();
    setShowHeat(!showHeat);
  };

  const recenter = () => {
    mapRef.current?.setZoomAndCenter?.(15.4, CENTER, false, 600);
  };

  const toggleMapType = () => {
    const AMap = window.AMap;
    const map = mapRef.current;
    if (!AMap || !map) return;
    const next = mapType === "standard" ? "satellite" : "standard";
    if (next === "satellite") {
      if (!satelliteRef.current) {
        satelliteRef.current = new AMap.TileLayer.Satellite();
        roadNetRef.current = new AMap.TileLayer.RoadNet();
      }
      map.add([satelliteRef.current, roadNetRef.current]);
    } else {
      if (satelliteRef.current) map.remove([satelliteRef.current, roadNetRef.current]);
    }
    setMapType(next);
  };

  const triggerSimulate = async () => {
    setSimulating(true);
    try {
      const { error } = await supabase.functions.invoke("ble-simulate", {
        body: { devices: 12 },
      });
      if (error) throw error;
      await fetchLive();
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "模拟失败";
      setFetchError(msg);
    } finally {
      setSimulating(false);
    }
  };

  const top5 = [...spots].sort((a, b) => b.count - a.count).slice(0, 5);
  const total = spots.reduce((s, x) => s + x.count, 0);
  const peak = top5[0];
  const isLive = lastFetchAt !== null && Date.now() - lastFetchAt < 12_000 && !fetchError;

  return (
    <div className="liquid-glass rounded-3xl p-6">
      <style>{`
        @keyframes heat-ping {
          0%   { transform: scale(0.95); opacity: 0.95; }
          70%  { transform: scale(1.12); opacity: 0.55; }
          100% { transform: scale(0.95); opacity: 0.95; }
        }
      `}</style>

      <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
        <div>
          <div
            className="text-foreground text-lg flex items-center gap-2"
            style={{ fontFamily: "'ZCOOL XiaoWei', serif", letterSpacing: "0.15em" }}
          >
            灵山胜境 · 实时热力图
            <span
              className={`inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full border ${
                isLive
                  ? "border-emerald-400/40 text-emerald-300 bg-emerald-400/10"
                  : "border-rose-400/40 text-rose-300 bg-rose-400/10"
              }`}
              title={fetchError ?? ""}
            >
              {isLive ? <Wifi className="w-2.5 h-2.5" /> : <WifiOff className="w-2.5 h-2.5" />}
              {isLive ? "LIVE" : fetchError ? "ERR" : "—"}
            </span>
          </div>
          <div className="text-muted-foreground text-xs mt-1">
            BLE 信标 60s 滑动窗口聚合 · 每 5 秒轮询后端
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={triggerSimulate}
            disabled={simulating}
            className="liquid-glass text-xs px-3 py-1.5 rounded-full text-foreground inline-flex items-center gap-1.5 hover:scale-[1.03] transition-transform disabled:opacity-50"
          >
            {simulating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Radio className="w-3.5 h-3.5" />}
            注入信标流量
          </button>
          <button
            onClick={toggleHeat}
            className="liquid-glass text-xs px-3 py-1.5 rounded-full text-foreground inline-flex items-center gap-1.5 hover:scale-[1.03] transition-transform"
          >
            <Layers className="w-3.5 h-3.5" />
            {showHeat ? "隐藏热力" : "显示热力"}
          </button>
          <button
            onClick={() => setShowMarkers((v) => !v)}
            className="liquid-glass text-xs px-3 py-1.5 rounded-full text-foreground inline-flex items-center gap-1.5 hover:scale-[1.03] transition-transform"
          >
            {showMarkers ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
            {showMarkers ? "隐藏景点" : "显示景点"}
          </button>
          <button
            onClick={toggleMapType}
            className="liquid-glass text-xs px-3 py-1.5 rounded-full text-foreground inline-flex items-center gap-1.5 hover:scale-[1.03] transition-transform"
          >
            {mapType === "standard" ? <Globe className="w-3.5 h-3.5" /> : <MapIcon className="w-3.5 h-3.5" />}
            {mapType === "standard" ? "卫星图" : "标准图"}
          </button>
          <button
            onClick={recenter}
            className="liquid-glass text-xs px-3 py-1.5 rounded-full text-foreground inline-flex items-center gap-1.5 hover:scale-[1.03] transition-transform"
          >
            <Crosshair className="w-3.5 h-3.5" />
            回到景区
          </button>
        </div>
      </div>

      <div className="flex items-center gap-4 mb-3 text-[11px] text-muted-foreground flex-wrap">
        <div className="flex items-center gap-2">
          <span>低</span>
          <div className="w-28 h-2 rounded-full bg-gradient-to-r from-emerald-400/60 via-amber-400/80 to-rose-500" />
          <span>高</span>
        </div>
        <div className="h-3 w-px bg-white/10" />
        {Object.entries(CATEGORY_COLOR).filter(([k]) => k !== "其他").map(([k, v]) => (
          <div key={k} className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full" style={{ background: v, boxShadow: `0 0 8px ${v}` }} />
            <span>{k}</span>
          </div>
        ))}
      </div>

      <div className="relative rounded-2xl overflow-hidden border border-white/10" style={{ height: 440 }}>
        <div ref={containerRef} className="absolute inset-0" />

        {(error || fetchError) && (
          <div className="absolute left-3 top-3 max-w-xs liquid-glass rounded-xl px-3 py-2 text-[11px] text-rose-200 border border-rose-400/30">
            <div className="flex items-center gap-1.5 mb-0.5">
              <MapPin className="w-3 h-3" />
              {error ? "地图错误" : "数据错误"}
            </div>
            <div className="text-muted-foreground">{error ?? fetchError}</div>
          </div>
        )}

        <div
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              "linear-gradient(180deg, rgba(7,40,60,0.35) 0%, rgba(7,40,60,0) 22%, rgba(7,40,60,0) 78%, rgba(7,40,60,0.5) 100%)",
          }}
        />
        <div className="pointer-events-none absolute inset-0 rounded-2xl shadow-[inset_0_1px_0_rgba(255,255,255,0.18),inset_0_-1px_0_rgba(255,255,255,0.06)]" />

        <div className="absolute right-3 top-3 liquid-glass rounded-2xl px-4 py-3 min-w-[180px]">
          <div className="text-[10px] text-muted-foreground tracking-[0.25em]">REAL-TIME</div>
          <div className="mt-1 text-foreground text-2xl" style={{ fontFamily: "'Instrument Serif', serif" }}>
            {loading ? "—" : total.toLocaleString()}
            <span className="text-xs text-muted-foreground ml-1">人在景区</span>
          </div>
          <div className="mt-2 flex items-center gap-1.5 text-[11px] text-rose-300">
            <Flame className="w-3 h-3" />
            {peak ? `峰值：${peak.name} · ${peak.count}` : "暂无人流"}
          </div>
          <div className="mt-1 text-[10px] text-muted-foreground">
            {lastFetchAt ? `更新 ${Math.max(0, Math.round((Date.now() - lastFetchAt) / 1000))}s 前` : "等待数据…"}
          </div>
        </div>

        <div className="absolute left-3 bottom-3 liquid-glass rounded-xl px-3 py-1.5 text-[11px] text-foreground/90 tracking-wider">
          XUNMI · BLE LIVE FEED
        </div>
      </div>

      <div className="mt-4 grid grid-cols-1 md:grid-cols-5 gap-2">
        {top5.map((s, i) => (
          <div
            key={s.id}
            className="rounded-2xl bg-white/5 border border-white/10 p-3 flex flex-col gap-1 relative overflow-hidden"
          >
            <div
              className="absolute inset-0 opacity-30 pointer-events-none"
              style={{
                background: `radial-gradient(circle at 0% 0%, ${
                  CATEGORY_COLOR[s.category] ?? CATEGORY_COLOR["其他"]
                }, transparent 60%)`,
              }}
            />
            <div className="text-[10px] text-muted-foreground tracking-widest">TOP {i + 1}</div>
            <div className="text-foreground text-sm">{s.name}</div>
            <div className="text-foreground/80 text-xs flex items-center justify-between">
              <span className="text-muted-foreground">{s.category}</span>
              <span style={{ fontFamily: "'Instrument Serif', serif", fontSize: "1.05rem" }}>{s.count}</span>
            </div>
          </div>
        ))}
        {top5.length === 0 && (
          <div className="md:col-span-5 rounded-2xl bg-white/5 border border-white/10 p-6 text-center text-sm text-muted-foreground">
            暂无 BLE 上报数据 · 点击「注入信标流量」生成一批测试数据，或调用 <code className="text-foreground">/ble-ingest</code> 接口接入真实信标网关。
          </div>
        )}
      </div>
    </div>
  );
}
