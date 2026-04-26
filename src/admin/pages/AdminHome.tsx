import { useEffect, useState } from "react";
import { Users, Eye, Flame, Bot, TrendingUp } from "lucide-react";
import { useDB } from "../store";
import HeatMapPanel from "../components/HeatMapPanel";

function Stat({ icon: Icon, label, value, suffix, accent }: any) {
  return (
    <div className="liquid-glass rounded-3xl p-6 relative overflow-hidden">
      <div className="flex items-start justify-between">
        <div>
          <div className="text-muted-foreground text-xs tracking-widest">{label}</div>
          <div className="mt-3 text-foreground text-4xl" style={{ fontFamily: "'Instrument Serif', serif" }}>
            {value}
            <span className="text-base text-muted-foreground ml-1">{suffix}</span>
          </div>
        </div>
        <div className={`w-11 h-11 rounded-2xl flex items-center justify-center ${accent}`}>
          <Icon className="w-5 h-5 text-foreground" />
        </div>
      </div>
      <div className="mt-4 flex items-center gap-1 text-xs text-emerald-300/90">
        <TrendingUp className="w-3 h-3" />
        较昨日 +{Math.floor(Math.random() * 12 + 3)}%
      </div>
    </div>
  );
}

export default function AdminHome() {
  const db = useDB();
  const [online, setOnline] = useState(1284);
  useEffect(() => {
    const t = setInterval(() => setOnline((v) => v + Math.floor(Math.random() * 7) - 3), 2000);
    return () => clearInterval(t);
  }, []);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        <Stat icon={Users} label="今日客流" value="8,742" suffix="人次" accent="bg-sky-500/30" />
        <Stat icon={Eye} label="在线人数" value={online.toLocaleString()} suffix="人" accent="bg-emerald-500/30" />
        <Stat icon={Flame} label="热点区域" value="听涛阁" suffix="" accent="bg-rose-500/30" />
        <Stat icon={Bot} label="数字人调用" value="3,021" suffix="次" accent="bg-violet-500/30" />
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
            <Item label="景区区域(BLE)" value={db.areas.length} />
            <Item label="景区数字人" value={db.avatars.length} />
          </div>
          <div className="mt-6 p-4 rounded-2xl bg-white/5 border border-white/10 text-xs text-muted-foreground leading-relaxed">
            💡 互动中心可一键审核游客帖子、推送紧急通知至游客端页眉滚动栏。
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
