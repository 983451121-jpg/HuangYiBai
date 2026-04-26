import { useState } from "react";
import { Shield, X, User, Lock } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { login } from "@/admin/store";
import { showToast } from "@/admin/Toast";

const Index = () => {
  const navigate = useNavigate();
  const [showLogin, setShowLogin] = useState(false);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (login(username, password)) {
      showToast("登录成功，正在进入后台…");
      setTimeout(() => navigate("/admin/home"), 400);
    } else {
      showToast("请填写账号和至少 3 位密码");
    }
  };

  return (
    <div className="relative min-h-screen w-full overflow-hidden bg-background">
      {/* Fullscreen background video */}
      <video
        autoPlay
        loop
        muted
        playsInline
        className="absolute inset-0 w-full h-full object-cover z-0"
      >
        <source src="/hero-bg.mp4" type="video/mp4" />
      </video>

      {/* Soft vignette for legibility */}
      <div className="absolute inset-0 z-0 bg-gradient-to-b from-background/30 via-transparent to-background/60 pointer-events-none" />

      {/* Hero — centered logo + admin entry */}
      <main className="relative z-10 flex min-h-screen flex-col items-center justify-center px-6 text-center">
        <h1
          className="animate-fade-rise select-none text-foreground"
          style={{
            fontFamily: "'Ma Shan Zheng', 'ZCOOL XiaoWei', cursive",
            fontSize: "clamp(6rem, 18vw, 16rem)",
            lineHeight: 1,
            letterSpacing: "0.15em",
            textShadow:
              "0 4px 24px rgba(0,0,0,0.55), 0 1px 0 rgba(255,255,255,0.15)",
          }}
        >
          寻觅
        </h1>

        <p
          className="animate-fade-rise-delay mt-6 text-muted-foreground tracking-[0.5em] text-sm sm:text-base pl-2"
          style={{ fontFamily: "'ZCOOL XiaoWei', serif" }}
        >
          XUN · MI
        </p>

        <button
          onClick={() => setShowLogin(true)}
          className="animate-fade-rise-delay-2 liquid-glass mt-16 inline-flex items-center gap-2 rounded-full px-10 py-4 text-sm text-foreground hover:scale-[1.03] cursor-pointer"
        >
          <Shield className="w-4 h-4" />
          管理员登录
        </button>
      </main>

      {/* Glass login modal */}
      {showLogin && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center px-4 animate-fade-rise"
          style={{ animationDuration: "0.4s" }}
        >
          <div
            className="absolute inset-0 bg-background/40 backdrop-blur-sm"
            onClick={() => setShowLogin(false)}
          />

          <div className="liquid-glass relative w-full max-w-md rounded-3xl p-10">
            <button
              onClick={() => setShowLogin(false)}
              className="absolute right-5 top-5 text-muted-foreground hover:text-foreground transition-colors"
              aria-label="关闭"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="text-center mb-8">
              <h2
                className="text-foreground text-3xl"
                style={{ fontFamily: "'Ma Shan Zheng', cursive", letterSpacing: "0.1em" }}
              >
                管理员登录
              </h2>
              <p className="text-muted-foreground text-xs mt-2 tracking-widest">
                ADMIN PORTAL
              </p>
            </div>

            <form onSubmit={handleLogin} className="space-y-5">
              <div className="relative">
                <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="账号"
                  className="w-full bg-white/5 border border-white/10 rounded-full py-3 pl-11 pr-4 text-sm text-foreground placeholder:text-muted-foreground/70 focus:outline-none focus:border-white/30 transition-colors"
                />
              </div>

              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="密码"
                  className="w-full bg-white/5 border border-white/10 rounded-full py-3 pl-11 pr-4 text-sm text-foreground placeholder:text-muted-foreground/70 focus:outline-none focus:border-white/30 transition-colors"
                />
              </div>

              <button
                type="submit"
                className="liquid-glass w-full rounded-full py-3 text-sm text-foreground hover:scale-[1.02] transition-transform"
              >
                进入后台
              </button>
            </form>

            <p className="text-center text-muted-foreground/70 text-xs mt-6">
              仅授权管理员可登录 · 寻觅景区 AI 导览平台
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default Index;
