import { useState } from "react";
import { CheckCircle2, XCircle, Trash2, ArrowDownToLine, Pin, Send, AlertTriangle } from "lucide-react";
import { api, useDB, PostCategory } from "../store";
import { showToast } from "../Toast";

const categories: PostCategory[] = ["寻人启事", "失物招领", "求助信息", "游玩分享"];

function timeAgo(ts: number) {
  const m = Math.floor((Date.now() - ts) / 60000);
  if (m < 1) return "刚刚";
  if (m < 60) return `${m} 分钟前`;
  return `${Math.floor(m / 60)} 小时前`;
}

function PostCard({ post, actions }: { post: any; actions: React.ReactNode }) {
  return (
    <div className="rounded-2xl bg-white/5 hover:bg-white/[0.08] transition-colors p-4 border border-white/10">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/10 text-foreground tracking-wider">
              {post.category}
            </span>
            {post.urgent && (
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-rose-500/30 text-rose-100 flex items-center gap-1">
                <AlertTriangle className="w-3 h-3" />紧急
              </span>
            )}
            {post.showInHeader && (
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/30 text-amber-100 flex items-center gap-1">
                <Pin className="w-3 h-3" />页眉
              </span>
            )}
          </div>
          <div className="text-foreground text-sm font-medium truncate">{post.title}</div>
          <div className="text-muted-foreground text-xs mt-1.5 line-clamp-2">{post.content}</div>
          <div className="text-[10px] text-muted-foreground/70 mt-2">
            {post.author} · {timeAgo(post.createdAt)}
          </div>
        </div>
      </div>
      <div className="flex items-center gap-1.5 mt-3 pt-3 border-t border-white/5">{actions}</div>
    </div>
  );
}

const btn = "flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-lg bg-white/5 hover:bg-white/15 text-foreground transition-colors";

export default function AdminInteract() {
  const db = useDB();
  const pending = db.posts.filter((p) => p.status === "pending");
  const published = db.posts.filter((p) => p.status === "published");
  const headerPosts = db.posts.filter((p) => p.showInHeader && p.status === "published");

  const [form, setForm] = useState({
    title: "",
    content: "",
    category: "求助信息" as PostCategory,
    showInHeader: true,
    urgent: false,
  });

  const handlePush = () => {
    if (!form.title.trim() || !form.content.trim()) return showToast("请填写标题和内容");
    api.pushPost(form);
    setForm({ ...form, title: "", content: "" });
    showToast("推送成功");
  };

  const stats = [
    { label: "待审核", value: pending.length, color: "text-amber-200" },
    { label: "已发布", value: published.length, color: "text-emerald-200" },
    { label: "页眉公告", value: headerPosts.length, color: "text-sky-200" },
    { label: "今日新增", value: db.posts.filter((p) => Date.now() - p.createdAt < 86400000).length, color: "text-violet-200" },
  ];

  return (
    <div className="space-y-4">
      {/* 顶部统计 */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {stats.map((s) => (
          <div key={s.label} className="liquid-glass rounded-2xl p-4">
            <div className="text-muted-foreground text-xs tracking-widest">{s.label}</div>
            <div className={`mt-1 ${s.color}`} style={{ fontFamily: "'Instrument Serif', serif", fontSize: "2rem" }}>
              {s.value}
            </div>
          </div>
        ))}
      </div>

      {/* 三列工作区 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* 待审核 */}
        <div className="liquid-glass rounded-3xl p-5 flex flex-col min-h-[60vh]">
          <Header title="待审核帖子" subtitle={`${pending.length} 条等待处理`} />
          <div className="space-y-3 overflow-auto flex-1 pr-1">
            {pending.length === 0 && <Empty text="暂无待审核帖子" />}
            {pending.map((p) => (
              <PostCard
                key={p.id}
                post={p}
                actions={
                  <>
                    <button className={btn} onClick={() => { api.approvePost(p.id); showToast("已发布"); }}>
                      <CheckCircle2 className="w-3 h-3" />同意
                    </button>
                    <button className={btn} onClick={() => { api.rejectPost(p.id); showToast("已拒绝"); }}>
                      <XCircle className="w-3 h-3" />拒绝
                    </button>
                  </>
                }
              />
            ))}
          </div>
        </div>

        {/* 已发布 */}
        <div className="liquid-glass rounded-3xl p-5 flex flex-col min-h-[60vh]">
          <Header title="已发布帖子" subtitle={`${published.length} 条在线`} />
          <div className="space-y-3 overflow-auto flex-1 pr-1">
            {published.length === 0 && <Empty text="暂无已发布帖子" />}
            {published.map((p) => (
              <PostCard
                key={p.id}
                post={p}
                actions={
                  <>
                    <button className={btn} onClick={() => { api.toggleHeader(p.id); showToast(p.showInHeader ? "已取消页眉" : "已设为页眉"); }}>
                      <Pin className="w-3 h-3" />{p.showInHeader ? "取消页眉" : "设为页眉"}
                    </button>
                    <button className={btn} onClick={() => { api.offlinePost(p.id); showToast("已下架"); }}>
                      <ArrowDownToLine className="w-3 h-3" />下架
                    </button>
                    <button className={btn} onClick={() => { api.deletePost(p.id); showToast("已删除"); }}>
                      <Trash2 className="w-3 h-3" />删除
                    </button>
                  </>
                }
              />
            ))}
          </div>
        </div>

        {/* 推送编辑器 */}
        <div className="liquid-glass rounded-3xl p-5 flex flex-col min-h-[60vh]">
          <Header title="主动推送" subtitle="天气 · 人流 · 紧急通知" />
          <div className="space-y-3 flex-1">
            <div className="flex gap-2 flex-wrap">
              {categories.map((c) => (
                <button
                  key={c}
                  onClick={() => setForm({ ...form, category: c })}
                  className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${
                    form.category === c ? "bg-white/20 border-white/40 text-foreground" : "bg-white/5 border-white/10 text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {c}
                </button>
              ))}
            </div>
            <input
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              placeholder="通知标题（如：山顶雷阵雨预警）"
              className="w-full bg-white/5 border border-white/10 rounded-xl py-2.5 px-4 text-sm text-foreground placeholder:text-muted-foreground/70 focus:outline-none focus:border-white/30"
            />
            <textarea
              value={form.content}
              onChange={(e) => setForm({ ...form, content: e.target.value })}
              placeholder="详细内容…"
              rows={5}
              className="w-full bg-white/5 border border-white/10 rounded-xl py-2.5 px-4 text-sm text-foreground placeholder:text-muted-foreground/70 focus:outline-none focus:border-white/30 resize-none"
            />
            <label className="flex items-center gap-2 text-sm text-muted-foreground cursor-pointer">
              <input type="checkbox" checked={form.showInHeader} onChange={(e) => setForm({ ...form, showInHeader: e.target.checked })} className="accent-white" />
              在游客端页眉滚动公告中显示
            </label>
            <label className="flex items-center gap-2 text-sm text-muted-foreground cursor-pointer">
              <input type="checkbox" checked={form.urgent} onChange={(e) => setForm({ ...form, urgent: e.target.checked })} className="accent-white" />
              标记为紧急（高亮显示）
            </label>
            <button
              onClick={handlePush}
              className="liquid-glass w-full rounded-xl py-3 text-sm text-foreground hover:scale-[1.02] transition-transform flex items-center justify-center gap-2"
            >
              <Send className="w-4 h-4" />立即推送
            </button>
          </div>
        </div>
      </div>

      {/* 页眉预览 */}
      <div className="liquid-glass rounded-3xl p-5">
        <Header title="游客端页眉公告 · 实时预览" subtitle="模拟游客端顶部横向滚动" />
        <div className="mt-3 rounded-2xl bg-black/40 border border-white/10 overflow-hidden">
          <div className="flex gap-8 py-3 px-4 whitespace-nowrap" style={{ animation: "marquee 30s linear infinite" }}>
            {[...headerPosts, ...headerPosts].map((p, i) => (
              <span key={i} className={`text-sm flex items-center gap-2 ${p.urgent ? "text-rose-200" : "text-foreground"}`}>
                {p.urgent && <AlertTriangle className="w-3.5 h-3.5" />}
                {p.title}
              </span>
            ))}
            {headerPosts.length === 0 && <span className="text-sm text-muted-foreground">尚无页眉公告 · 在已发布帖子中点击「设为页眉」</span>}
          </div>
        </div>
        <style>{`@keyframes marquee { from{transform:translateX(0)} to{transform:translateX(-50%)} }`}</style>
      </div>
    </div>
  );
}

function Header({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div className="mb-4">
      <div className="text-foreground text-lg" style={{ fontFamily: "'ZCOOL XiaoWei', serif", letterSpacing: "0.12em" }}>
        {title}
      </div>
      <div className="text-muted-foreground text-xs mt-0.5">{subtitle}</div>
    </div>
  );
}
function Empty({ text }: { text: string }) {
  return <div className="flex-1 flex items-center justify-center text-sm text-muted-foreground/70 py-12">{text}</div>;
}
