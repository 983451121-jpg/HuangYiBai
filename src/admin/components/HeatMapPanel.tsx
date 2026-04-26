import { useEffect, useRef, useState } from "react";
import { Layers, MapPin } from "lucide-react";

// 高德地图 Key（来自 https://console.amap.com/dev/key/app）
// 公共浏览器端 Key，可直接放在前端代码中
const AMAP_KEY = (import.meta.env.VITE_AMAP_KEY as string) || "YOUR_AMAP_KEY";
const AMAP_SECURITY_CODE = (import.meta.env.VITE_AMAP_SECURITY_CODE as string) || "";

// 寻觅景区中心点（示例：杭州西湖）
const CENTER: [number, number] = [120.1551, 30.2422];

// 模拟热点：景区内的人流密集点
const HOTSPOTS = [
  { lng: 120.1551, lat: 30.2422, count: 320 }, // 听涛阁
  { lng: 120.1572, lat: 30.2433, count: 280 }, // 云海台
  { lng: 120.1535, lat: 30.2401, count: 180 },
  { lng: 120.1588, lat: 30.2418, count: 240 },
  { lng: 120.1561, lat: 30.2389, count: 95 },
  { lng: 120.1520, lat: 30.2440, count: 150 },
  { lng: 120.1602, lat: 30.2455, count: 210 },
  { lng: 120.1495, lat: 30.2415, count: 70 },
  { lng: 120.1545, lat: 30.2460, count: 130 },
  { lng: 120.1580, lat: 30.2398, count: 175 },
];

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
    s.src = `https://webapi.amap.com/maps?v=2.0&key=${AMAP_KEY}&plugin=AMap.HeatMap`;
    s.async = true;
    s.onload = () => resolve(window.AMap);
    s.onerror = () => reject(new Error("AMap script load failed"));
    document.head.appendChild(s);
  });
  return amapLoadPromise;
}

export default function HeatMapPanel() {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const heatRef = useRef<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [showHeat, setShowHeat] = useState(true);

  useEffect(() => {
    if (AMAP_KEY === "YOUR_AMAP_KEY") {
      setError("尚未配置高德地图 Key，请在项目中设置 VITE_AMAP_KEY");
      return;
    }

    let disposed = false;
    loadAMap()
      .then((AMap) => {
        if (disposed || !containerRef.current) return;

        const map = new AMap.Map(containerRef.current, {
          zoom: 15,
          center: CENTER,
          mapStyle: "amap://styles/dark", // 暗色底图，与玻璃风格更搭
          viewMode: "2D",
          features: ["bg", "road", "building", "point"],
        });
        mapRef.current = map;

        // 等待加载 HeatMap 插件
        AMap.plugin(["AMap.HeatMap"], () => {
          if (disposed) return;
          const heatmap = new AMap.HeatMap(map, {
            radius: 50,
            opacity: [0, 0.85],
            gradient: {
              0.2: "rgba(80,200,180,0.6)",
              0.4: "rgba(120,220,140,0.7)",
              0.6: "rgba(255,200,80,0.85)",
              0.8: "rgba(255,120,80,0.9)",
              1.0: "rgba(255,60,80,1)",
            },
          });
          heatmap.setDataSet({
            data: HOTSPOTS.map((h) => ({ lng: h.lng, lat: h.lat, count: h.count })),
            max: 350,
          });
          heatRef.current = heatmap;
        });
      })
      .catch((e) => setError(e.message));

    return () => {
      disposed = true;
      try {
        mapRef.current?.destroy?.();
      } catch {}
      mapRef.current = null;
      heatRef.current = null;
    };
  }, []);

  const toggleHeat = () => {
    if (!heatRef.current) return;
    if (showHeat) heatRef.current.hide();
    else heatRef.current.show();
    setShowHeat(!showHeat);
  };

  return (
    <div className="liquid-glass rounded-3xl p-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <div
            className="text-foreground text-lg"
            style={{ fontFamily: "'ZCOOL XiaoWei', serif", letterSpacing: "0.15em" }}
          >
            热点区域分布
          </div>
          <div className="text-muted-foreground text-xs mt-1">
            高德地图实时人流热力图 · 玻璃叠加层
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={toggleHeat}
            className="liquid-glass text-xs px-3 py-1.5 rounded-full text-foreground inline-flex items-center gap-1.5 hover:scale-[1.03] transition-transform"
          >
            <Layers className="w-3.5 h-3.5" />
            {showHeat ? "隐藏热力" : "显示热力"}
          </button>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span>低</span>
            <div className="w-24 h-2 rounded-full bg-gradient-to-r from-emerald-400/60 via-amber-400/80 to-rose-500" />
            <span>高</span>
          </div>
        </div>
      </div>

      {/* 地图容器 + 玻璃叠加层 */}
      <div className="relative rounded-2xl overflow-hidden border border-white/10" style={{ height: 380 }}>
        <div ref={containerRef} className="absolute inset-0" />

        {/* 错误/未配置占位 */}
        {error && (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-6 bg-black/30">
            <MapPin className="w-8 h-8 text-muted-foreground mb-3" />
            <div className="text-foreground text-sm mb-1">高德地图未就绪</div>
            <div className="text-muted-foreground text-xs max-w-md leading-relaxed">{error}</div>
            <div className="text-muted-foreground/70 text-[11px] mt-3">
              在 <code className="text-foreground">.env</code> 中添加 <code className="text-foreground">VITE_AMAP_KEY</code> 与
              <code className="text-foreground"> VITE_AMAP_SECURITY_CODE</code>
            </div>
          </div>
        )}

        {/* 顶部柔光渐变叠加（保留可读性） */}
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              "linear-gradient(180deg, rgba(7,40,60,0.35) 0%, rgba(7,40,60,0) 25%, rgba(7,40,60,0) 75%, rgba(7,40,60,0.45) 100%)",
          }}
        />

        {/* 玻璃边框反光（liquid-glass 边框感） */}
        <div className="pointer-events-none absolute inset-0 rounded-2xl shadow-[inset_0_1px_0_rgba(255,255,255,0.18),inset_0_-1px_0_rgba(255,255,255,0.06)]" />

        {/* 角落水印标签 */}
        <div className="absolute left-3 bottom-3 liquid-glass rounded-xl px-3 py-1.5 text-[11px] text-foreground/90 tracking-wider">
          XUNMI · LIVE HEATMAP
        </div>
      </div>

      <div className="mt-3 grid grid-cols-3 gap-2 text-xs text-muted-foreground">
        <Mini label="峰值热点" value="听涛阁" />
        <Mini label="活跃热点" value={`${HOTSPOTS.length} 个`} />
        <Mini label="实时密度" value="高" />
      </div>
    </div>
  );
}

function Mini({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-white/5 px-3 py-2 flex items-center justify-between">
      <span>{label}</span>
      <span className="text-foreground">{value}</span>
    </div>
  );
}
