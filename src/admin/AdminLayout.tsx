import { ReactNode, useEffect } from "react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { LayoutDashboard, Mountain, MessageSquareHeart, UserCircle, LogOut, Sparkles } from "lucide-react";
import { isLoggedIn, logout, currentUser, useDB } from "./store";

const navItems = [
  { to: "/admin/home", icon: LayoutDashboard, label: "仪表盘" },
  { to: "/admin/scenic", icon: Mountain, label: "景区管理" },
  { to: "/admin/interact", icon: MessageSquareHeart, label: "互动中心", badge: true },
  { to: "/admin/profile", icon: UserCircle, label: "我的" },
];

export default function AdminLayout({ children }: { children?: ReactNode }) {
  const navigate = useNavigate();
  const db = useDB();
  const pendingCount = db.posts.filter((p) => p.status === "pending").length;

  useEffect(() => {
    if (!isLoggedIn()) navigate("/", { replace: true });
  }, [navigate]);

  const handleLogout = () => {
    logout();
    navigate("/", { replace: true });
  };

  return (
    <div className="relative min-h-screen w-full overflow-hidden bg-background">
      {/* 复用主页视频背景，保持视觉一致 */}
      <video autoPlay loop muted playsInline className="fixed inset-0 w-full h-full object-cover z-0">
        <source src="/hero-bg.mp4" type="video/mp4" />
      </video>
      <div className="fixed inset-0 z-0 bg-gradient-to-br from-background/70 via-background/55 to-background/80 pointer-events-none" />

      <div className="relative z-10 flex min-h-screen">
        {/* 侧边栏 */}
        <aside className="liquid-glass m-4 flex w-60 flex-col rounded-3xl p-5">
          <div className="flex items-center gap-2 px-2 pb-6">
            <Sparkles className="w-5 h-5 text-foreground" />
            <div>
              <div
                className="text-xl text-foreground leading-none"
                style={{ fontFamily: "'Ma Shan Zheng', cursive", letterSpacing: "0.1em" }}
              >
                寻觅
              </div>
              <div className="text-[10px] text-muted-foreground tracking-[0.3em] mt-1">ADMIN</div>
            </div>
          </div>

          <nav className="flex flex-col gap-1.5 flex-1">
            {navItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  `group flex items-center gap-3 rounded-2xl px-3.5 py-3 text-sm transition-all ${
                    isActive
                      ? "bg-white/15 text-foreground shadow-[inset_0_1px_0_rgba(255,255,255,0.2)]"
                      : "text-muted-foreground hover:text-foreground hover:bg-white/5"
                  }`
                }
              >
                <item.icon className="w-4 h-4" />
                <span className="flex-1">{item.label}</span>
                {item.badge && pendingCount > 0 && (
                  <span className="rounded-full bg-destructive/80 text-destructive-foreground text-[10px] px-1.5 py-0.5">
                    {pendingCount}
                  </span>
                )}
              </NavLink>
            ))}
          </nav>

          <button
            onClick={handleLogout}
            className="flex items-center gap-2 rounded-2xl px-3.5 py-3 text-sm text-muted-foreground hover:text-foreground hover:bg-white/5 transition-colors"
          >
            <LogOut className="w-4 h-4" />
            退出登录
          </button>
        </aside>

        {/* 主区 */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* 顶部条 */}
          <header className="m-4 mb-0 liquid-glass rounded-3xl px-6 py-4 flex items-center justify-between">
            <div>
              <div className="text-foreground text-sm" style={{ fontFamily: "'ZCOOL XiaoWei', serif", letterSpacing: "0.2em" }}>
                XUNMI · ADMIN CONSOLE
              </div>
              <div className="text-muted-foreground text-xs mt-1">寻觅景区 AI 导览平台 · 管理后台</div>
            </div>
            <div className="flex items-center gap-3 text-sm">
              <span className="text-muted-foreground">欢迎，</span>
              <span className="text-foreground">{currentUser()}</span>
              <div className="w-9 h-9 rounded-full bg-white/10 border border-white/20 flex items-center justify-center text-foreground">
                {currentUser().slice(0, 1).toUpperCase()}
              </div>
            </div>
          </header>

          {/* 内容 */}
          <main className="flex-1 p-4 overflow-auto">
            <div className="animate-fade-rise">{children ?? <Outlet />}</div>
          </main>
        </div>
      </div>
    </div>
  );
}
