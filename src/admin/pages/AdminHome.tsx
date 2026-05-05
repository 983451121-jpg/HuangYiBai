import { useEffect, useMemo, useState } from "react";
import { Users, Eye, Flame, Bot, TrendingUp } from "lucide-react";
import { useDB } from "../store";
import HeatMapPanel, { SPOTS } from "../components/HeatMapPanel";

function Stat({ icon: Icon, label, value, suffix, accent, delta }: any) {
  return (
    <div className="liquid-glass rounded-3xl p-6 relative overflow-hidden">
      <div className="flex items-start justify-between">
        <div className="min-w-0">
          <div className="text-muted-foreground text-xs tracking-widest">{label}</div>
          <div
            className="mt-3 text-foreground text-4xl truncate"
            style={{ fontFamily: "'Instrument Serif', serif" }}
            title={String(value)}
          >
            {value}
            {suffix && <span className="text-base text-muted-foreground ml-1">{suffix}</span>}
          </div>
        </div>
        <div className={`w-11 h-11 rounded-2xl flex items-center justify-center ${accent}`}>
          <Icon className="w-5 h-5 text-foreground" />
        </div>
      </div>
      <div className="mt-4 flex items-center gap-1 text-xs text-emerald-300/90">
        <TrendingUp className="w-3 h-3" />
        {delta}
      </div>
    </div>
  );
}

export default function AdminHome() {
  const db = useDB();

  // 基于真实景点数据实时模拟波动
  const [spots, setSpots] = useState(SPOTS);
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

  // 在线人数 = 所有景点当前人数总和
  const online = useMemo(() => spots.reduce((sum, s) => sum + s.count, 0), [spots]);

  // 今日客流 = 在线人数 × 系数（按时段累计）
  const todayFlow = useMemo(() => Math.round(online * 6.8), [online]);

  // 热点区域 = 当前实时人数最高的景点
  const hotspot = useMemo(
    () => [...spots].sort((a, b) => b.count - a.count)[0],
    [spots]
  );

  // 数字人调用 = 在线人数 × 调用率
  const aiCalls = useMemo(() => Math.round(online * 0.72), [online]);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        <Stat
          icon={Users}
          label="今日客流"
          value={todayFlow.toLocaleString()}
          suffix="人次"
          accent="bg-sky-500/30"
          delta="较昨日 +8%"
        />
        <Stat
          icon={Eye}
          label="在线人数"
          value={online.toLocaleString()}
          suffix="人"
          accent="bg-emerald-500/30"
          delta="实时刷新"
        />
        <Stat
          icon={Flame}
          label="热点区域"
          value={hotspot?.name ?? "—"}
          suffix={hotspot ? `· ${hotspot.count}人` : ""}
          accent="bg-rose-500/30"
          delta={hotspot ? `分类：${hotspot.category}` : ""}
        />
        <Stat
          icon={Bot}
          label="数字人调用"
          value={aiCalls.toLocaleString()}
          suffix="次"
          accent="bg-violet-500/30"
          delta="较昨日 +12%"
        />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        <div className="xl:col-span-2"><HeatMapPanel /></div>
        <div className="liquid-glass rounded-3xl p-6">
          <div className="text-foreground text-lg mb-4" style={{ fontFamily: "'ZCOOL XiaoWei', serif", letterSpacing: "0.15em" }}>
            待处理事项
          </div>
          <div className="space-y-3">
            <Item label="待审核帖子" value={db.posts.filter((p) => p.status === "pending").length} />
            <Item label="页眉公告" value={db.posts.filter((p) => p.showInHeader).length} />
            <Item label="景区景点(灵山胜境)" value={spots.length} />
            <Item label="景区数字人" value={db.avatars.length} />
          </div>
          <div className="mt-6 p-4 rounded-2xl bg-white/5 border border-white/10 text-xs text-muted-foreground leading-relaxed">
            💡 当前热点景点为 <span className="text-foreground">{hotspot?.name}</span>，
            建议在互动中心向游客端推送分流提示。
          </div>
        </div>
      </div>
    </div>
  );
}

function Item({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex items-center justify-between rounded-2xl bg-white/5 px-4 py-3">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className="text-foreground" style={{ fontFamily: "'Instrument Serif', serif", fontSize: "1.4rem" }}>
        {value}
      </span>
    </div>
  );
}
