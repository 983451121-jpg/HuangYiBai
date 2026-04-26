import { useState } from "react";
import { Plus, Trash2, MapPin, Package, Bot, Save } from "lucide-react";
import { api, useDB, ScenicArea, Goods, ScenicAvatar } from "../store";
import { showToast } from "../Toast";

const tabs = [
  { id: "info", label: "景区信息", icon: MapPin },
  { id: "areas", label: "区域 + BLE", icon: MapPin },
  { id: "goods", label: "文创商品", icon: Package },
  { id: "avatars", label: "景区数字人", icon: Bot },
] as const;

const inputCls = "w-full bg-white/5 border border-white/10 rounded-xl py-2.5 px-4 text-sm text-foreground placeholder:text-muted-foreground/70 focus:outline-none focus:border-white/30";

export default function AdminScenic() {
  const db = useDB();
  const [tab, setTab] = useState<(typeof tabs)[number]["id"]>("info");

  return (
    <div className="space-y-4">
      <div className="liquid-glass rounded-3xl p-2 inline-flex gap-1">
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-2xl text-sm transition-all ${
              tab === t.id ? "bg-white/15 text-foreground" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <t.icon className="w-4 h-4" />
            {t.label}
          </button>
        ))}
      </div>

      {tab === "info" && <InfoPane db={db} />}
      {tab === "areas" && <AreasPane db={db} />}
      {tab === "goods" && <GoodsPane db={db} />}
      {tab === "avatars" && <AvatarsPane db={db} />}
    </div>
  );
}

function InfoPane({ db }: any) {
  const [s, setS] = useState(db.scenic);
  return (
    <div className="liquid-glass rounded-3xl p-6 max-w-2xl space-y-4">
      <Header title="景区基础信息" />
      <div>
        <Label>景区名称</Label>
        <input className={inputCls} value={s.name} onChange={(e) => setS({ ...s, name: e.target.value })} />
      </div>
      <div>
        <Label>简介</Label>
        <textarea className={inputCls + " resize-none"} rows={4} value={s.intro} onChange={(e) => setS({ ...s, intro: e.target.value })} />
      </div>
      <div>
        <Label>地图素材 URL（高德地图自定义底图）</Label>
        <input className={inputCls} value={s.mapUrl} onChange={(e) => setS({ ...s, mapUrl: e.target.value })} placeholder="https://..." />
      </div>
      <button
        onClick={() => { api.saveScenic(s); showToast("已保存"); }}
        className="liquid-glass rounded-xl px-6 py-2.5 text-sm text-foreground hover:scale-[1.02] transition-transform inline-flex items-center gap-2"
      >
        <Save className="w-4 h-4" />保存
      </button>
    </div>
  );
}

function AreasPane({ db }: any) {
  const empty: ScenicArea = { id: "", name: "", bleUuid: "", lat: 0, lng: 0, description: "" };
  const [draft, setDraft] = useState<ScenicArea>(empty);
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <div className="liquid-glass rounded-3xl p-6 space-y-3">
        <Header title={draft.id ? "编辑区域" : "新建区域"} />
        <div className="grid grid-cols-2 gap-3">
          <div><Label>名称</Label><input className={inputCls} value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} /></div>
          <div><Label>BLE UUID</Label><input className={inputCls} value={draft.bleUuid} onChange={(e) => setDraft({ ...draft, bleUuid: e.target.value })} /></div>
          <div><Label>纬度</Label><input className={inputCls} type="number" value={draft.lat} onChange={(e) => setDraft({ ...draft, lat: +e.target.value })} /></div>
          <div><Label>经度</Label><input className={inputCls} type="number" value={draft.lng} onChange={(e) => setDraft({ ...draft, lng: +e.target.value })} /></div>
        </div>
        <div><Label>描述</Label><textarea rows={3} className={inputCls + " resize-none"} value={draft.description} onChange={(e) => setDraft({ ...draft, description: e.target.value })} /></div>
        <div className="flex gap-2">
          <button onClick={() => { if (!draft.name) return showToast("请填写名称"); api.upsertArea(draft); setDraft(empty); showToast("已保存"); }} className="liquid-glass rounded-xl px-5 py-2.5 text-sm text-foreground inline-flex items-center gap-2">
            <Plus className="w-4 h-4" />{draft.id ? "更新" : "添加"}
          </button>
          {draft.id && <button onClick={() => setDraft(empty)} className="text-sm text-muted-foreground px-3">取消</button>}
        </div>
      </div>
      <div className="liquid-glass rounded-3xl p-6">
        <Header title={`区域列表（${db.areas.length}）`} />
        <div className="space-y-2">
          {db.areas.map((a: ScenicArea) => (
            <div key={a.id} className="rounded-2xl bg-white/5 px-4 py-3 flex items-center justify-between">
              <div className="min-w-0">
                <div className="text-foreground text-sm">{a.name}</div>
                <div className="text-muted-foreground text-xs truncate">BLE: {a.bleUuid}</div>
                <div className="text-muted-foreground text-xs">{a.lat}, {a.lng}</div>
              </div>
              <div className="flex gap-1">
                <button onClick={() => setDraft(a)} className="text-xs px-2.5 py-1.5 rounded-lg bg-white/5 hover:bg-white/15 text-foreground">编辑</button>
                <button onClick={() => { api.removeArea(a.id); showToast("已删除"); }} className="text-xs px-2.5 py-1.5 rounded-lg bg-white/5 hover:bg-white/15 text-foreground"><Trash2 className="w-3 h-3" /></button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function GoodsPane({ db }: any) {
  const empty: Goods = { id: "", name: "", price: 0, stock: 0 };
  const [draft, setDraft] = useState<Goods>(empty);
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <div className="liquid-glass rounded-3xl p-6 space-y-3">
        <Header title={draft.id ? "编辑商品" : "新建文创商品"} />
        <div><Label>名称</Label><input className={inputCls} value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} /></div>
        <div className="grid grid-cols-2 gap-3">
          <div><Label>价格 (¥)</Label><input className={inputCls} type="number" value={draft.price} onChange={(e) => setDraft({ ...draft, price: +e.target.value })} /></div>
          <div><Label>库存</Label><input className={inputCls} type="number" value={draft.stock} onChange={(e) => setDraft({ ...draft, stock: +e.target.value })} /></div>
        </div>
        <div className="flex gap-2">
          <button onClick={() => { if (!draft.name) return showToast("请填写名称"); api.upsertGoods(draft); setDraft(empty); showToast("已保存"); }} className="liquid-glass rounded-xl px-5 py-2.5 text-sm text-foreground inline-flex items-center gap-2">
            <Plus className="w-4 h-4" />{draft.id ? "更新" : "添加"}
          </button>
        </div>
      </div>
      <div className="liquid-glass rounded-3xl p-6">
        <Header title={`商品列表（${db.goods.length}）`} />
        <div className="space-y-2">
          {db.goods.map((g: Goods) => (
            <div key={g.id} className="rounded-2xl bg-white/5 px-4 py-3 flex items-center justify-between">
              <div>
                <div className="text-foreground text-sm">{g.name}</div>
                <div className="text-muted-foreground text-xs">¥{g.price} · 库存 {g.stock}</div>
              </div>
              <div className="flex gap-1">
                <button onClick={() => setDraft(g)} className="text-xs px-2.5 py-1.5 rounded-lg bg-white/5 hover:bg-white/15 text-foreground">编辑</button>
                <button onClick={() => { api.removeGoods(g.id); showToast("已删除"); }} className="text-xs px-2.5 py-1.5 rounded-lg bg-white/5 hover:bg-white/15 text-foreground"><Trash2 className="w-3 h-3" /></button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function AvatarsPane({ db }: any) {
  const empty: ScenicAvatar = { id: "", name: "", avatar: "🤖", language: "中文", dialect: "普通话", style: "亲切", intro: "", knowledge: "" };
  const [draft, setDraft] = useState<ScenicAvatar>(empty);
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <div className="liquid-glass rounded-3xl p-6 space-y-3">
        <Header title={draft.id ? "编辑数字人" : "新建景区数字人"} />
        <div className="grid grid-cols-2 gap-3">
          <div><Label>名称</Label><input className={inputCls} value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} /></div>
          <div><Label>头像 (Emoji)</Label><input className={inputCls} value={draft.avatar} onChange={(e) => setDraft({ ...draft, avatar: e.target.value })} /></div>
          <div><Label>语言</Label><input className={inputCls} value={draft.language} onChange={(e) => setDraft({ ...draft, language: e.target.value })} /></div>
          <div><Label>方言</Label><input className={inputCls} value={draft.dialect} onChange={(e) => setDraft({ ...draft, dialect: e.target.value })} placeholder="如：粤语 / 川普 / 闽南语" /></div>
          <div className="col-span-2"><Label>风格</Label><input className={inputCls} value={draft.style} onChange={(e) => setDraft({ ...draft, style: e.target.value })} placeholder="温柔 / 幽默 / 学者" /></div>
        </div>
        <div><Label>介绍</Label><textarea rows={2} className={inputCls + " resize-none"} value={draft.intro} onChange={(e) => setDraft({ ...draft, intro: e.target.value })} /></div>
        <div><Label>知识库</Label><textarea rows={3} className={inputCls + " resize-none"} value={draft.knowledge} onChange={(e) => setDraft({ ...draft, knowledge: e.target.value })} placeholder="景点典故、动植物、餐饮…" /></div>
        <div className="flex gap-2">
          <button onClick={() => { if (!draft.name) return showToast("请填写名称"); api.upsertAvatar(draft); setDraft(empty); showToast("已保存"); }} className="liquid-glass rounded-xl px-5 py-2.5 text-sm text-foreground inline-flex items-center gap-2">
            <Plus className="w-4 h-4" />{draft.id ? "更新" : "添加"}
          </button>
        </div>
      </div>
      <div className="liquid-glass rounded-3xl p-6">
        <Header title={`数字人列表（${db.avatars.length}）`} />
        <div className="space-y-2">
          {db.avatars.map((a: ScenicAvatar) => (
            <div key={a.id} className="rounded-2xl bg-white/5 px-4 py-3 flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-white/10 flex items-center justify-center text-2xl">{a.avatar}</div>
              <div className="flex-1 min-w-0">
                <div className="text-foreground text-sm">{a.name} · <span className="text-muted-foreground text-xs">{a.dialect}</span></div>
                <div className="text-muted-foreground text-xs truncate">{a.intro}</div>
              </div>
              <button onClick={() => setDraft(a)} className="text-xs px-2.5 py-1.5 rounded-lg bg-white/5 hover:bg-white/15 text-foreground">编辑</button>
              <button onClick={() => { api.removeAvatar(a.id); showToast("已删除"); }} className="text-xs px-2.5 py-1.5 rounded-lg bg-white/5 hover:bg-white/15 text-foreground"><Trash2 className="w-3 h-3" /></button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function Header({ title }: { title: string }) {
  return <div className="text-foreground text-lg mb-2" style={{ fontFamily: "'ZCOOL XiaoWei', serif", letterSpacing: "0.12em" }}>{title}</div>;
}
function Label({ children }: { children: React.ReactNode }) {
  return <div className="text-muted-foreground text-xs mb-1.5 tracking-wider">{children}</div>;
}
