import { currentUser, logout } from "../store";
import { useNavigate } from "react-router-dom";
import { Shield, LogOut, Bot, Mountain, MessageSquareHeart } from "lucide-react";

export default function AdminProfile() {
  const navigate = useNavigate();
  const user = currentUser();

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      <div className="liquid-glass rounded-3xl p-8 lg:col-span-1 flex flex-col items-center text-center">
        <div className="w-24 h-24 rounded-full bg-white/10 border border-white/20 flex items-center justify-center text-4xl text-foreground"
          style={{ fontFamily: "'Ma Shan Zheng', cursive" }}>
          {user.slice(0, 1).toUpperCase()}
        </div>
        <div className="mt-4 text-foreground text-xl" style={{ fontFamily: "'ZCOOL XiaoWei', serif", letterSpacing: "0.15em" }}>
          {user}
        </div>
        <div className="text-muted-foreground text-xs mt-1 tracking-widest flex items-center gap-1">
          <Shield className="w-3 h-3" />超级管理员
        </div>
        <div className="w-full mt-6 space-y-2 text-left text-sm">
          <Row k="角色" v="ADMIN" />
          <Row k="所属景区" v="寻觅景区" />
          <Row k="登录方式" v="账号密码" />
          <Row k="最近登录" v={new Date().toLocaleString("zh-CN")} />
        </div>
        <button
          onClick={() => { logout(); navigate("/", { replace: true }); }}
          className="liquid-glass mt-6 w-full rounded-xl py-3 text-sm text-foreground hover:scale-[1.02] transition-transform inline-flex items-center justify-center gap-2"
        >
          <LogOut className="w-4 h-4" />退出登录
        </button>
      </div>

      <div className="lg:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Card icon={MessageSquareHeart} title="互动中心" desc="审核游客发布的寻人 / 失物 / 求助 / 分享帖子，并主动推送通知。" to="/admin/interact" navigate={navigate} />
        <Card icon={Mountain} title="景区管理" desc="维护景区信息、BLE 区域、文创商品与景区数字人配置。" to="/admin/scenic" navigate={navigate} />
        <Card icon={Bot} title="AI 数字人" desc="个性形象 + 方言 + 知识库，预留千问 API。" to="/admin/scenic" navigate={navigate} />
        <Card icon={Shield} title="权限说明" desc="本演示账号拥有全部读写权限。生产环境请通过 Lovable Cloud 接入真实鉴权。" to="" navigate={navigate} />
      </div>
    </div>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex items-center justify-between bg-white/5 rounded-xl px-3 py-2">
      <span className="text-muted-foreground">{k}</span>
      <span className="text-foreground">{v}</span>
    </div>
  );
}

function Card({ icon: Icon, title, desc, to, navigate }: any) {
  return (
    <button
      onClick={() => to && navigate(to)}
      className="liquid-glass rounded-3xl p-6 text-left hover:scale-[1.02] transition-transform"
    >
      <Icon className="w-6 h-6 text-foreground mb-3" />
      <div className="text-foreground text-base mb-1.5" style={{ fontFamily: "'ZCOOL XiaoWei', serif", letterSpacing: "0.1em" }}>
        {title}
      </div>
      <div className="text-muted-foreground text-xs leading-relaxed">{desc}</div>
    </button>
  );
}
