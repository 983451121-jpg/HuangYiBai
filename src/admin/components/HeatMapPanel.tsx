import { useEffect, useRef, useState } from "react";
import { Layers, MapPin, Flame, Eye, EyeOff, Crosshair } from "lucide-react";

// 高德地图 Key
const AMAP_KEY = (import.meta.env.VITE_AMAP_KEY as string) || "8a89d20b7f2d4a90ca361d2f56a59186";
const AMAP_SECURITY_CODE = (import.meta.env.VITE_AMAP_SECURITY_CODE as string) || "";

// === 寻觅 · 灵山胜境景区 ===
// 景区中心：无锡马山灵山胜境（梵宫前广场附近）
const CENTER: [number, number] = [120.0894, 31.4445];

// 景区边界（粗略范围 polygon），用于在地图上勾出景区轮廓
const SCENIC_BOUNDARY: [number, number][] = [
  [120.0820, 31.4500],
  [120.0865, 31.4520],
  [120.0935, 31.4515],
  [120.0980, 31.4480],
  [120.0985, 31.4430],
  [120.0960, 31.4385],
  [120.0905, 31.4365],
  [120.0850, 31.4380],
  [120.0815, 31.4425],
  [120.0820, 31.4500],
];

// === 灵山胜境核心景点（基于结构化数据集）===
// 坐标为景区内相对位置（基于公开地图近似定位）
interface Spot {
  id: string;
  name: string;
  lng: number;
  lat: number;
  count: number;        // 当前在区域内人数
  category: "佛教朝圣" | "自然景观" | "禅意体验" | "演艺" | "服务";
}

export const SPOTS: Spot[] = [
  // 灵山胜境核心区
  { id: "LS-001", name: "灵山大照壁",   lng: 120.0905, lat: 31.4480, count: 280, category: "佛教朝圣" },
  { id: "LS-002", name: "五明桥",       lng: 120.0908, lat: 31.4470, count: 195, category: "佛教朝圣" },
  { id: "LS-003", name: "胜境门楼",     lng: 120.0910, lat: 31.4462, count: 230, category: "佛教朝圣" },
  { id: "LS-004", name: "洗心池",       lng: 120.0912, lat: 31.4455, count: 140, category: "禅意体验" },
  { id: "LS-005", name: "五智门",       lng: 120.0914, lat: 31.4448, count: 175, category: "佛教朝圣" },
  { id: "LS-006", name: "九龙灌浴",     lng: 120.0918, lat: 31.4440, count: 520, category: "演艺" },
  { id: "LS-007", name: "降魔成道",     lng: 120.0922, lat: 31.4432, count: 165, category: "演艺" },
  { id: "LS-008", name: "阿育王柱",     lng: 120.0925, lat: 31.4425, count: 120, category: "佛教朝圣" },
  { id: "LS-009", name: "祥符禅寺",     lng: 120.0930, lat: 31.4418, count: 410, category: "佛教朝圣" },
  { id: "LS-010", name: "灵山大佛",     lng: 120.0938, lat: 31.4408, count: 680, category: "佛教朝圣" },
  { id: "LS-011", name: "百子戏弥勒",   lng: 120.0928, lat: 31.4413, count: 245, category: "佛教朝圣" },
  { id: "LS-012", name: "万佛殿",       lng: 120.0942, lat: 31.4402, count: 320, category: "佛教朝圣" },
  { id: "LS-013", name: "梵宫",         lng: 120.0895, lat: 31.4435, count: 595, category: "演艺" },
  { id: "LS-014", name: "五印坛城",     lng: 120.0875, lat: 31.4448, count: 285, category: "佛教朝圣" },
  { id: "LS-015", name: "曼飞龙塔",     lng: 120.0868, lat: 31.4452, count: 110, category: "自然景观" },
  { id: "LS-016", name: "无尽意斋",     lng: 120.0915, lat: 31.4395, count: 75,  category: "禅意体验" },

  // 拈花湾禅意小镇
  { id: "NHW-01", name: "拈花湾入口",   lng: 120.0838, lat: 31.4470, count: 360, category: "服务" },
  { id: "NHW-02", name: "香月花街",     lng: 120.0830, lat: 31.4460, count: 470, category: "禅意体验" },
  { id: "NHW-03", name: "拈花塔",       lng: 120.0822, lat: 31.4452, count: 380, category: "演艺" },
  { id: "NHW-04", name: "五灯湖",       lng: 120.0828, lat: 31.4445, count: 290, category: "自然景观" },
  { id: "NHW-05", name: "鹿鸣谷",       lng: 120.0840, lat: 31.4438, count: 155, category: "自然景观" },
  { id: "NHW-06", name: "波罗蜜广场",   lng: 120.0832, lat: 31.4475, count: 215, category: "禅意体验" },
];

// 在每个景点周围生成扰动点，让热力图过渡更自然
function expandHeat(spots: Spot[]) {
  const data: { lng: number; lat: number; count: number }[] = [];
  for (const s of spots) {
    data.push({ lng: s.lng, lat: s.lat, count: s.count });
    const ring = Math.max(3, Math.round(s.count / 80));
    for (let i = 0; i < ring; i++) {
      const a = (Math.PI * 2 * i) / ring;
      const r = 0.0008 + Math.random() * 0.0010;
      data.push({
        lng: s.lng + Math.cos(a) * r,
        lat: s.lat + Math.sin(a) * r,
        count: Math.round(s.count * (0.35 + Math.random() * 0.35)),
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
    s.src = `https://webapi.amap.com/maps?v=2.0&key=${AMAP_KEY}&plugin=AMap.HeatMap,AMap.Scale,AMap.ToolBar`;
    s.async = true;
    s.onload = () => resolve(window.AMap);
    s.onerror = () => reject(new Error("AMap script load failed"));
    document.head.appendChild(s);
  });
  return amapLoadPromise;
}

const CATEGORY_COLOR: Record<Spot["category"], string> = {
  佛教朝圣: "#f59e0b",
  自然景观: "#34d399",
  禅意体验: "#60a5fa",
  演艺:     "#f472b6",
  服务:     "#a78bfa",
};

export default function HeatMapPanel() {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const heatRef = useRef<any>(null);
  const markersRef = useRef<any[]>([]);
  const polygonRef = useRef<any>(null);

  const [error, setError] = useState<string | null>(null);
  const [showHeat, setShowHeat] = useState(true);
  const [showMarkers, setShowMarkers] = useState(true);
  const [spots, setSpots] = useState<Spot[]>(SPOTS);

  // 实时人流轻微波动
  useEffect(() => {
    const t = setInterval(() => {
      setSpots((prev) =>
        prev.map((s) => ({
          ...s,
          count: Math.max(20, s.count + Math.floor(Math.random() * 30) - 15),
        }))
      );
    }, 3500);
    return () => clearInterval(t);
  }, []);

  // 初始化地图
  useEffect(() => {
    let disposed = false;
    loadAMap()
      .then((AMap) => {
        if (disposed || !containerRef.current) return;

        const map = new AMap.Map(containerRef.current, {
          zoom: 15.4,
          center: CENTER,
          mapStyle: "amap://styles/dark",
          viewMode: "2D",
          features: ["bg", "road", "building", "point"],
          pitch: 0,
        });
        mapRef.current = map;

        map.addControl(new AMap.Scale({ position: "LB" }));

        // 景区边界 polygon（玻璃质感描边）
        const polygon = new AMap.Polygon({
          path: SCENIC_BOUNDARY,
          strokeColor: "#7dd3fc",
          strokeWeight: 1.5,
          strokeOpacity: 0.9,
          fillColor: "#0ea5e9",
          fillOpacity: 0.06,
          strokeStyle: "dashed",
          strokeDasharray: [6, 4],
        });
        polygon.setMap(map);
        polygonRef.current = polygon;

        // 中心标签
        const label = new AMap.Text({
          text: "灵山胜境 · 寻觅",
          position: CENTER,
          offset: new AMap.Pixel(0, -8),
          style: {
            background: "rgba(10,20,30,0.55)",
            border: "1px solid rgba(255,255,255,0.18)",
            color: "#fff",
            padding: "4px 10px",
            borderRadius: "999px",
            fontSize: "11px",
            letterSpacing: "2px",
            backdropFilter: "blur(8px)",
          },
        });
        label.setMap(map);

        AMap.plugin(["AMap.HeatMap"], () => {
          if (disposed) return;
          const heatmap = new AMap.HeatMap(map, {
            radius: 55,
            opacity: [0, 0.85],
            gradient: {
              0.2: "rgba(80,200,180,0.55)",
              0.4: "rgba(140,220,120,0.7)",
              0.6: "rgba(255,210,90,0.85)",
              0.8: "rgba(255,130,80,0.92)",
              1.0: "rgba(255,60,90,1)",
            },
          });
          heatmap.setDataSet({
            data: expandHeat(SPOTS),
            max: 700,
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
      } catch {}
      markersRef.current = [];
      mapRef.current = null;
      heatRef.current = null;
    };
  }, []);

  // 标记点 + 实时刷新热力数据
  useEffect(() => {
    const AMap = window.AMap;
    const map = mapRef.current;
    if (!AMap || !map) return;

    // 刷新热力
    if (heatRef.current) {
      heatRef.current.setDataSet({ data: expandHeat(spots), max: 700 });
    }

    // 重建标记
    markersRef.current.forEach((m) => m.setMap(null));
    markersRef.current = [];

    if (!showMarkers) return;

    spots.forEach((s) => {
      const color = CATEGORY_COLOR[s.category];
      const size = Math.min(36, 14 + s.count / 30);
      const dom = document.createElement("div");
      dom.innerHTML = `
        <div style="position:relative;transform:translate(-50%,-50%);">
          <div style="
            width:${size}px;height:${size}px;border-radius:50%;
            background:radial-gradient(circle at 30% 30%, ${color}cc, ${color}55 70%, transparent 75%);
            box-shadow:0 0 14px ${color}99, inset 0 0 6px rgba(255,255,255,0.4);
            border:1px solid rgba(255,255,255,0.5);
            display:flex;align-items:center;justify-content:center;
            backdrop-filter:blur(2px);
          "></div>
          <div style="
            position:absolute;top:100%;left:50%;transform:translate(-50%,4px);
            white-space:nowrap;font-size:10px;color:#fff;
            background:rgba(10,15,25,0.6);padding:2px 6px;border-radius:8px;
            border:1px solid rgba(255,255,255,0.12);letter-spacing:1px;
          ">${s.name} · ${s.count}</div>
        </div>`;
      const marker = new AMap.Marker({
        position: [s.lng, s.lat],
        content: dom,
        anchor: "center",
        zIndex: 200,
      });
      marker.setMap(map);
      markersRef.current.push(marker);
    });
  }, [spots, showMarkers]);

  const toggleHeat = () => {
    if (!heatRef.current) return;
    if (showHeat) heatRef.current.hide();
    else heatRef.current.show();
    setShowHeat(!showHeat);
  };

  const recenter = () => {
    mapRef.current?.setZoomAndCenter?.(15.4, CENTER, false, 600);
  };

  // 排序后的 Top 5 热点
  const top5 = [...spots].sort((a, b) => b.count - a.count).slice(0, 5);
  const total = spots.reduce((s, x) => s + x.count, 0);
  const peak = top5[0];

  return (
    <div className="liquid-glass rounded-3xl p-6">
      <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
        <div>
          <div
            className="text-foreground text-lg"
            style={{ fontFamily: "'ZCOOL XiaoWei', serif", letterSpacing: "0.15em" }}
          >
            灵山胜境 · 实时热力图
          </div>
          <div className="text-muted-foreground text-xs mt-1">
            高德地图 · 景区景点级人流热力 · 玻璃叠加层
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
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
            onClick={recenter}
            className="liquid-glass text-xs px-3 py-1.5 rounded-full text-foreground inline-flex items-center gap-1.5 hover:scale-[1.03] transition-transform"
          >
            <Crosshair className="w-3.5 h-3.5" />
            回到景区
          </button>
        </div>
      </div>

      {/* 图例 */}
      <div className="flex items-center gap-4 mb-3 text-[11px] text-muted-foreground flex-wrap">
        <div className="flex items-center gap-2">
          <span>低</span>
          <div className="w-28 h-2 rounded-full bg-gradient-to-r from-emerald-400/60 via-amber-400/80 to-rose-500" />
          <span>高</span>
        </div>
        <div className="h-3 w-px bg-white/10" />
        {Object.entries(CATEGORY_COLOR).map(([k, v]) => (
          <div key={k} className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full" style={{ background: v, boxShadow: `0 0 8px ${v}` }} />
            <span>{k}</span>
          </div>
        ))}
      </div>

      {/* 地图容器 */}
      <div className="relative rounded-2xl overflow-hidden border border-white/10" style={{ height: 440 }}>
        <div ref={containerRef} className="absolute inset-0" />

        {error && (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-6 bg-black/30">
            <MapPin className="w-8 h-8 text-muted-foreground mb-3" />
            <div className="text-foreground text-sm mb-1">高德地图未就绪</div>
            <div className="text-muted-foreground text-xs max-w-md leading-relaxed">{error}</div>
          </div>
        )}

        {/* 顶部柔光 */}
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              "linear-gradient(180deg, rgba(7,40,60,0.35) 0%, rgba(7,40,60,0) 22%, rgba(7,40,60,0) 78%, rgba(7,40,60,0.5) 100%)",
          }}
        />
        {/* 玻璃边框 */}
        <div className="pointer-events-none absolute inset-0 rounded-2xl shadow-[inset_0_1px_0_rgba(255,255,255,0.18),inset_0_-1px_0_rgba(255,255,255,0.06)]" />

        {/* 实时统计 浮窗 */}
        <div className="absolute right-3 top-3 liquid-glass rounded-2xl px-4 py-3 min-w-[180px]">
          <div className="text-[10px] text-muted-foreground tracking-[0.25em]">REAL-TIME</div>
          <div className="mt-1 text-foreground text-2xl" style={{ fontFamily: "'Instrument Serif', serif" }}>
            {total.toLocaleString()}
            <span className="text-xs text-muted-foreground ml-1">人在景区</span>
          </div>
          <div className="mt-2 flex items-center gap-1.5 text-[11px] text-rose-300">
            <Flame className="w-3 h-3" />
            峰值：{peak?.name} · {peak?.count}
          </div>
        </div>

        {/* 角落水印 */}
        <div className="absolute left-3 bottom-3 liquid-glass rounded-xl px-3 py-1.5 text-[11px] text-foreground/90 tracking-wider">
          XUNMI · 灵山胜境 LIVE
        </div>
      </div>

      {/* Top 5 热点榜 */}
      <div className="mt-4 grid grid-cols-1 md:grid-cols-5 gap-2">
        {top5.map((s, i) => (
          <div
            key={s.id}
            className="rounded-2xl bg-white/5 border border-white/10 p-3 flex flex-col gap-1 relative overflow-hidden"
          >
            <div
              className="absolute inset-0 opacity-30 pointer-events-none"
              style={{
                background: `radial-gradient(circle at 0% 0%, ${CATEGORY_COLOR[s.category]}, transparent 60%)`,
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
      </div>
    </div>
  );
}
