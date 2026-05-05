import { useEffect, useMemo, useRef, useState } from "react";
import { Layers, MapPin, Flame, Eye, EyeOff, Crosshair, Image as ImageIcon, Map as MapIcon } from "lucide-react";
import { useDB } from "../store";

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
  const db = useDB();
  const customImg = db.scenic?.mapImage || db.scenic?.mapUrl || "";
  const bounds = db.scenic?.mapBounds || { west: 120.0815, south: 31.4365, east: 120.0985, north: 31.4520 };

  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const heatRef = useRef<any>(null);
  const markersRef = useRef<any[]>([]);
  const polygonRef = useRef<any>(null);

  const [error, setError] = useState<string | null>(null);
  const [showHeat, setShowHeat] = useState(true);
  const [showMarkers, setShowMarkers] = useState(true);
  const [spots, setSpots] = useState<Spot[]>(SPOTS);
  // 模式：自动 → 有图就用 custom，无图用 amap；用户也可强制切换
  const [forceMode, setForceMode] = useState<"auto" | "amap" | "custom">("auto");
  const mode: "amap" | "custom" =
    forceMode === "amap" ? "amap" : forceMode === "custom" ? "custom" : (customImg ? "custom" : "amap");

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

  // 初始化高德地图（仅在 amap 模式且容器存在时）
  useEffect(() => {
    if (mode !== "amap") return;
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
          heatmap.setDataSet({ data: expandHeat(SPOTS), max: 700 });
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
  }, [mode]);

  // 高德 marker + 热力刷新
  useEffect(() => {
    if (mode !== "amap") return;
    const AMap = window.AMap;
    const map = mapRef.current;
    if (!AMap || !map) return;

    if (heatRef.current) heatRef.current.setDataSet({ data: expandHeat(spots), max: 700 });

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
  }, [spots, showMarkers, mode]);

  const toggleHeat = () => {
    if (mode === "amap") {
      if (!heatRef.current) return;
      if (showHeat) heatRef.current.hide();
      else heatRef.current.show();
    }
    setShowHeat(!showHeat);
  };

  const recenter = () => {
    if (mode === "amap") {
      mapRef.current?.setZoomAndCenter?.(15.4, CENTER, false, 600);
    } else {
      window.dispatchEvent(new CustomEvent("xunmi-custom-map-reset"));
    }
  };

  const top5 = [...spots].sort((a, b) => b.count - a.count).slice(0, 5);
  const total = spots.reduce((s, x) => s + x.count, 0);
  const peak = top5[0];

  return (
    <div className="liquid-glass rounded-3xl p-6">
      <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
        <div>
          <div className="text-foreground text-lg" style={{ fontFamily: "'ZCOOL XiaoWei', serif", letterSpacing: "0.15em" }}>
            灵山胜境 · 实时热力图
          </div>
          <div className="text-muted-foreground text-xs mt-1">
            {mode === "custom" ? "自定义底图 · 经纬度等比映射 · 滚轮缩放" : "高德地图 · 景区景点级人流热力 · 玻璃叠加层"}
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {customImg && (
            <button
              onClick={() => setForceMode(mode === "amap" ? "custom" : "amap")}
              className="liquid-glass text-xs px-3 py-1.5 rounded-full text-foreground inline-flex items-center gap-1.5 hover:scale-[1.03] transition-transform"
            >
              {mode === "amap" ? <ImageIcon className="w-3.5 h-3.5" /> : <MapIcon className="w-3.5 h-3.5" />}
              {mode === "amap" ? "切到自定义图" : "切到高德地图"}
            </button>
          )}
          <button onClick={toggleHeat} className="liquid-glass text-xs px-3 py-1.5 rounded-full text-foreground inline-flex items-center gap-1.5 hover:scale-[1.03] transition-transform">
            <Layers className="w-3.5 h-3.5" />
            {showHeat ? "隐藏热力" : "显示热力"}
          </button>
          <button onClick={() => setShowMarkers((v) => !v)} className="liquid-glass text-xs px-3 py-1.5 rounded-full text-foreground inline-flex items-center gap-1.5 hover:scale-[1.03] transition-transform">
            {showMarkers ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
            {showMarkers ? "隐藏景点" : "显示景点"}
          </button>
          <button onClick={recenter} className="liquid-glass text-xs px-3 py-1.5 rounded-full text-foreground inline-flex items-center gap-1.5 hover:scale-[1.03] transition-transform">
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
        {Object.entries(CATEGORY_COLOR).map(([k, v]) => (
          <div key={k} className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full" style={{ background: v, boxShadow: `0 0 8px ${v}` }} />
            <span>{k}</span>
          </div>
        ))}
      </div>

      <div className="relative rounded-2xl overflow-hidden border border-white/10" style={{ height: 440 }}>
        {mode === "amap" ? (
          <div ref={containerRef} className="absolute inset-0" />
        ) : (
          <CustomMapView
            image={customImg}
            bounds={bounds}
            spots={spots}
            showHeat={showHeat}
            showMarkers={showMarkers}
          />
        )}

        {error && mode === "amap" && (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-6 bg-black/30">
            <MapPin className="w-8 h-8 text-muted-foreground mb-3" />
            <div className="text-foreground text-sm mb-1">高德地图未就绪</div>
            <div className="text-muted-foreground text-xs max-w-md leading-relaxed">{error}</div>
          </div>
        )}

        <div className="pointer-events-none absolute inset-0" style={{
          background: "linear-gradient(180deg, rgba(7,40,60,0.35) 0%, rgba(7,40,60,0) 22%, rgba(7,40,60,0) 78%, rgba(7,40,60,0.5) 100%)",
        }} />
        <div className="pointer-events-none absolute inset-0 rounded-2xl shadow-[inset_0_1px_0_rgba(255,255,255,0.18),inset_0_-1px_0_rgba(255,255,255,0.06)]" />

        <div className="absolute right-3 top-3 liquid-glass rounded-2xl px-4 py-3 min-w-[180px] pointer-events-none">
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

        <div className="absolute left-3 bottom-3 liquid-glass rounded-xl px-3 py-1.5 text-[11px] text-foreground/90 tracking-wider pointer-events-none">
          XUNMI · 灵山胜境 LIVE
        </div>
      </div>

      <div className="mt-4 grid grid-cols-1 md:grid-cols-5 gap-2">
        {top5.map((s, i) => (
          <div key={s.id} className="rounded-2xl bg-white/5 border border-white/10 p-3 flex flex-col gap-1 relative overflow-hidden">
            <div className="absolute inset-0 opacity-30 pointer-events-none" style={{
              background: `radial-gradient(circle at 0% 0%, ${CATEGORY_COLOR[s.category]}, transparent 60%)`,
            }} />
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

// ============== 自定义底图 + Canvas 热力 + 等比映射 ==============
interface Bounds { west: number; south: number; east: number; north: number; }

function CustomMapView({
  image, bounds, spots, showHeat, showMarkers,
}: {
  image: string;
  bounds: Bounds;
  spots: Spot[];
  showHeat: boolean;
  showMarkers: boolean;
}) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [imgSize, setImgSize] = useState({ w: 0, h: 0 });    // 图片自然像素尺寸
  const [boxSize, setBoxSize] = useState({ w: 0, h: 0 });    // 容器尺寸
  const [view, setView] = useState({ scale: 1, tx: 0, ty: 0 });
  const dragRef = useRef<{ x: number; y: number; tx: number; ty: number } | null>(null);

  // 监听容器尺寸
  useEffect(() => {
    if (!wrapRef.current) return;
    const ro = new ResizeObserver((entries) => {
      const r = entries[0].contentRect;
      setBoxSize({ w: r.width, h: r.height });
    });
    ro.observe(wrapRef.current);
    return () => ro.disconnect();
  }, []);

  // 重置视图（图片以 contain 方式适配）
  const resetView = () => setView({ scale: 1, tx: 0, ty: 0 });
  useEffect(() => {
    const h = () => resetView();
    window.addEventListener("xunmi-custom-map-reset", h);
    return () => window.removeEventListener("xunmi-custom-map-reset", h);
  }, []);

  // 计算图片在容器中的 contain 后的基础尺寸与偏移
  const layout = useMemo(() => {
    if (!imgSize.w || !boxSize.w) return { baseW: 0, baseH: 0, baseX: 0, baseY: 0 };
    const ratio = Math.min(boxSize.w / imgSize.w, boxSize.h / imgSize.h);
    const baseW = imgSize.w * ratio;
    const baseH = imgSize.h * ratio;
    const baseX = (boxSize.w - baseW) / 2;
    const baseY = (boxSize.h - baseH) / 2;
    return { baseW, baseH, baseX, baseY };
  }, [imgSize, boxSize]);

  // 经纬度 → 图片像素（在 base 尺寸下）
  const llToBasePx = (lng: number, lat: number) => {
    const { west, east, south, north } = bounds;
    const x = ((lng - west) / (east - west)) * layout.baseW;
    const y = (1 - (lat - south) / (north - south)) * layout.baseH;
    return { x: layout.baseX + x, y: layout.baseY + y };
  };

  // 应用 view（缩放 + 平移）后实际像素
  const project = (lng: number, lat: number) => {
    const p = llToBasePx(lng, lat);
    // 以容器中心为缩放中心
    const cx = boxSize.w / 2, cy = boxSize.h / 2;
    return {
      x: cx + (p.x - cx) * view.scale + view.tx,
      y: cy + (p.y - cy) * view.scale + view.ty,
    };
  };

  // 绘制 canvas 热力
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !boxSize.w || !boxSize.h) return;
    canvas.width = boxSize.w;
    canvas.height = boxSize.h;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    if (!showHeat || !layout.baseW) return;

    const maxCount = Math.max(...spots.map((s) => s.count), 1);
    // 1) 累积灰度
    const gray = document.createElement("canvas");
    gray.width = canvas.width;
    gray.height = canvas.height;
    const gctx = gray.getContext("2d")!;
    spots.forEach((s) => {
      const { x, y } = project(s.lng, s.lat);
      const intensity = Math.min(1, s.count / maxCount);
      const radius = 50 * view.scale * (0.7 + intensity * 0.6);
      const grd = gctx.createRadialGradient(x, y, 0, x, y, radius);
      grd.addColorStop(0, `rgba(0,0,0,${0.55 * intensity})`);
      grd.addColorStop(1, "rgba(0,0,0,0)");
      gctx.fillStyle = grd;
      gctx.beginPath();
      gctx.arc(x, y, radius, 0, Math.PI * 2);
      gctx.fill();
    });

    // 2) 灰度 → 渐变上色
    const data = gctx.getImageData(0, 0, canvas.width, canvas.height);
    const palette = buildPalette();
    for (let i = 0; i < data.data.length; i += 4) {
      const a = data.data[i + 3];
      if (a === 0) continue;
      const c = palette[a];
      data.data[i] = c[0];
      data.data[i + 1] = c[1];
      data.data[i + 2] = c[2];
      data.data[i + 3] = Math.min(220, a + 30);
    }
    ctx.putImageData(data, 0, 0);
  }, [spots, showHeat, view, boxSize, layout, bounds]);

  // 滚轮缩放（以鼠标为中心）
  const onWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const delta = -e.deltaY * 0.0015;
    const newScale = Math.max(0.5, Math.min(6, view.scale * (1 + delta)));
    if (newScale === view.scale) return;
    const rect = wrapRef.current!.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;
    const cx = boxSize.w / 2, cy = boxSize.h / 2;
    // 保持鼠标点在缩放后位置不变
    const k = newScale / view.scale;
    const tx = mx - (mx - view.tx - cx) * k - cx + (k - 1) * 0; // 简化
    const ty = my - (my - view.ty - cy) * k - cy;
    setView({ scale: newScale, tx, ty });
  };

  const onMouseDown = (e: React.MouseEvent) => {
    dragRef.current = { x: e.clientX, y: e.clientY, tx: view.tx, ty: view.ty };
  };
  const onMouseMove = (e: React.MouseEvent) => {
    const d = dragRef.current;
    if (!d) return;
    const dx = e.clientX - d.x;
    const dy = e.clientY - d.y;
    setView((v) => ({ ...v, tx: d.tx + dx, ty: d.ty + dy }));
  };
  const onMouseUp = () => { dragRef.current = null; };

  // 图片变换样式（与 project 一致）
  const imgStyle: React.CSSProperties = {
    position: "absolute",
    left: layout.baseX,
    top: layout.baseY,
    width: layout.baseW,
    height: layout.baseH,
    transform: `translate(${view.tx}px, ${view.ty}px) scale(${view.scale})`,
    transformOrigin: `${boxSize.w / 2 - layout.baseX}px ${boxSize.h / 2 - layout.baseY}px`,
    userSelect: "none",
    pointerEvents: "none",
  };

  return (
    <div
      ref={wrapRef}
      className="absolute inset-0 cursor-grab active:cursor-grabbing"
      style={{ background: "radial-gradient(circle at 50% 50%, #0b1a2a, #050810)" }}
      onWheel={onWheel}
      onMouseDown={onMouseDown}
      onMouseMove={onMouseMove}
      onMouseUp={onMouseUp}
      onMouseLeave={onMouseUp}
    >
      {image && (
        <img
          ref={imgRef}
          src={image}
          alt="map"
          draggable={false}
          style={imgStyle}
          onLoad={(e) => {
            const t = e.currentTarget;
            setImgSize({ w: t.naturalWidth, h: t.naturalHeight });
          }}
        />
      )}
      <canvas
        ref={canvasRef}
        className="absolute inset-0 pointer-events-none"
      />
      {showMarkers && layout.baseW > 0 && spots.map((s) => {
        const p = project(s.lng, s.lat);
        const color = CATEGORY_COLOR[s.category];
        const size = Math.min(36, 14 + s.count / 30) * Math.max(0.7, Math.min(1.4, view.scale));
        return (
          <div
            key={s.id}
            className="absolute pointer-events-none"
            style={{ left: p.x, top: p.y, transform: "translate(-50%,-50%)" }}
          >
            <div style={{
              width: size, height: size, borderRadius: "50%",
              background: `radial-gradient(circle at 30% 30%, ${color}cc, ${color}55 70%, transparent 75%)`,
              boxShadow: `0 0 14px ${color}99, inset 0 0 6px rgba(255,255,255,0.4)`,
              border: "1px solid rgba(255,255,255,0.5)",
            }} />
            <div style={{
              position: "absolute", top: "100%", left: "50%", transform: "translate(-50%,4px)",
              whiteSpace: "nowrap", fontSize: 10, color: "#fff",
              background: "rgba(10,15,25,0.6)", padding: "2px 6px", borderRadius: 8,
              border: "1px solid rgba(255,255,255,0.12)", letterSpacing: 1,
            }}>{s.name} · {s.count}</div>
          </div>
        );
      })}

      <div className="absolute left-3 top-3 liquid-glass rounded-xl px-2.5 py-1 text-[10px] text-foreground/80 tracking-widest pointer-events-none">
        缩放 {view.scale.toFixed(2)}× · 滚轮缩放 / 拖拽平移
      </div>
    </div>
  );
}

// 构建 256 级渐变查找表（绿→黄→红）
function buildPalette(): [number, number, number][] {
  const stops: [number, [number, number, number]][] = [
    [0.0, [0, 0, 0]],
    [0.2, [80, 200, 180]],
    [0.4, [140, 220, 120]],
    [0.6, [255, 210, 90]],
    [0.8, [255, 130, 80]],
    [1.0, [255, 60, 90]],
  ];
  const palette: [number, number, number][] = [];
  for (let i = 0; i < 256; i++) {
    const t = i / 255;
    let a = stops[0], b = stops[stops.length - 1];
    for (let k = 0; k < stops.length - 1; k++) {
      if (t >= stops[k][0] && t <= stops[k + 1][0]) { a = stops[k]; b = stops[k + 1]; break; }
    }
    const ratio = (t - a[0]) / Math.max(0.0001, b[0] - a[0]);
    palette.push([
      Math.round(a[1][0] + (b[1][0] - a[1][0]) * ratio),
      Math.round(a[1][1] + (b[1][1] - a[1][1]) * ratio),
      Math.round(a[1][2] + (b[1][2] - a[1][2]) * ratio),
    ]);
  }
  return palette;
}

