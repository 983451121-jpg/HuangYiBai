// 管理员后台 Mock 数据层（localStorage 持久化）
// 模拟文档中描述的 /api/admin/posts/* 与 /api/user/posts/* 接口
import { useEffect, useState } from "react";

export type PostCategory = "寻人启事" | "失物招领" | "求助信息" | "游玩分享";
export type PostStatus = "pending" | "published" | "rejected" | "offline";

export interface Post {
  id: string;
  title: string;
  content: string;
  category: PostCategory;
  author: string;
  createdAt: number;
  status: PostStatus;
  showInHeader?: boolean;
  urgent?: boolean;
}

export interface ScenicArea {
  id: string;
  name: string;
  bleUuid: string;
  lat: number;
  lng: number;
  description: string;
}

export interface Goods {
  id: string;
  name: string;
  price: number;
  stock: number;
}

export interface ScenicAvatar {
  id: string;
  name: string;
  avatar: string;
  language: string;
  dialect: string;
  style: string;
  intro: string;
  knowledge: string;
}

interface DB {
  posts: Post[];
  areas: ScenicArea[];
  goods: Goods[];
  avatars: ScenicAvatar[];
  scenic: {
    name: string;
    intro: string;
    mapUrl: string;
    mapImage?: string; // base64 / URL，自定义底图
    mapBounds?: { west: number; south: number; east: number; north: number }; // 图片对应的经纬度边界
  };
}

const KEY = "xunmi_admin_db_v1";

const seed = (): DB => ({
  posts: [
    { id: "p1", title: "寻找走失的小女孩 红色外套", content: "在听涛阁附近走失，6 岁，穿红色外套，蓝色牛仔裤，请知情人速联系工作人员。", category: "寻人启事", author: "游客 8821", createdAt: Date.now() - 1000 * 60 * 12, status: "pending", urgent: true },
    { id: "p2", title: "拾到一串车钥匙", content: "在 3 号观景台拾到银色车钥匙一把，钥匙扣为粉色兔子。", category: "失物招领", author: "游客 0231", createdAt: Date.now() - 1000 * 60 * 30, status: "pending" },
    { id: "p3", title: "今日云海绝美！", content: "凌晨 5 点登顶，云海翻腾如潮，强烈推荐！", category: "游玩分享", author: "游客 7712", createdAt: Date.now() - 1000 * 60 * 60 * 2, status: "published", showInHeader: false },
    { id: "p4", title: "🌧 山顶午后有雷阵雨，请注意安全", content: "气象台预警，14:00 后山顶将有强对流天气。", category: "求助信息", author: "管理员", createdAt: Date.now() - 1000 * 60 * 90, status: "published", showInHeader: true, urgent: true },
    { id: "p5", title: "求结伴下山", content: "一人下山有点害怕，求 17:00 左右一起下山的小伙伴。", category: "求助信息", author: "游客 5566", createdAt: Date.now() - 1000 * 60 * 5, status: "pending" },
  ],
  areas: [
    { id: "a1", name: "听涛阁", bleUuid: "FDA50693-A4E2-4FB1-AFCF-C6EB07647825", lat: 30.2422, lng: 120.1551, description: "主景观区，可俯瞰全景" },
    { id: "a2", name: "云海台", bleUuid: "FDA50693-A4E2-4FB1-AFCF-C6EB07647826", lat: 30.2433, lng: 120.1572, description: "日出日落最佳观景点" },
  ],
  goods: [
    { id: "g1", name: "寻觅联名帆布袋", price: 49, stock: 120 },
    { id: "g2", name: "云海明信片套装", price: 29, stock: 230 },
  ],
  avatars: [
    { id: "av1", name: "小觅", avatar: "🦊", language: "中文", dialect: "普通话", style: "温柔知性", intro: "寻觅景区官方 AI 导览，熟悉景区每一处秘境。", knowledge: "景区历史、典故、动植物、餐饮、住宿。" },
  ],
  scenic: {
    name: "灵山胜境",
    intro: "国家 5A 级景区，融合自然山水与人文古迹。",
    mapUrl: "",
    mapImage: "",
    mapBounds: { west: 120.0815, south: 31.4365, east: 120.0985, north: 31.4520 },
  },
});

function load(): DB {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  const s = seed();
  localStorage.setItem(KEY, JSON.stringify(s));
  return s;
}

function save(db: DB) {
  localStorage.setItem(KEY, JSON.stringify(db));
  window.dispatchEvent(new CustomEvent("xunmi-db-change"));
}

export function useDB() {
  const [db, setDB] = useState<DB>(() => load());
  useEffect(() => {
    const h = () => setDB(load());
    window.addEventListener("xunmi-db-change", h);
    window.addEventListener("storage", h);
    return () => {
      window.removeEventListener("xunmi-db-change", h);
      window.removeEventListener("storage", h);
    };
  }, []);
  return db;
}

// === 帖子接口 (模拟 fetch) ===
export const api = {
  approvePost(id: string) {
    const db = load();
    const p = db.posts.find((x) => x.id === id);
    if (p) p.status = "published";
    save(db);
  },
  rejectPost(id: string) {
    const db = load();
    const p = db.posts.find((x) => x.id === id);
    if (p) p.status = "rejected";
    save(db);
  },
  offlinePost(id: string) {
    const db = load();
    const p = db.posts.find((x) => x.id === id);
    if (p) {
      p.status = "offline";
      p.showInHeader = false;
    }
    save(db);
  },
  deletePost(id: string) {
    const db = load();
    db.posts = db.posts.filter((x) => x.id !== id);
    save(db);
  },
  toggleHeader(id: string) {
    const db = load();
    const p = db.posts.find((x) => x.id === id);
    if (p) p.showInHeader = !p.showInHeader;
    save(db);
  },
  pushPost(input: { title: string; content: string; showInHeader: boolean; urgent: boolean; category: PostCategory }) {
    const db = load();
    db.posts.unshift({
      id: "p" + Date.now(),
      title: input.title,
      content: input.content,
      category: input.category,
      author: "管理员",
      createdAt: Date.now(),
      status: "published",
      showInHeader: input.showInHeader,
      urgent: input.urgent,
    });
    save(db);
  },
  saveScenic(s: DB["scenic"]) {
    const db = load();
    db.scenic = s;
    save(db);
  },
  upsertArea(a: ScenicArea) {
    const db = load();
    const i = db.areas.findIndex((x) => x.id === a.id);
    if (i >= 0) db.areas[i] = a;
    else db.areas.push({ ...a, id: "a" + Date.now() });
    save(db);
  },
  removeArea(id: string) {
    const db = load();
    db.areas = db.areas.filter((x) => x.id !== id);
    save(db);
  },
  upsertGoods(g: Goods) {
    const db = load();
    const i = db.goods.findIndex((x) => x.id === g.id);
    if (i >= 0) db.goods[i] = g;
    else db.goods.push({ ...g, id: "g" + Date.now() });
    save(db);
  },
  removeGoods(id: string) {
    const db = load();
    db.goods = db.goods.filter((x) => x.id !== id);
    save(db);
  },
  upsertAvatar(a: ScenicAvatar) {
    const db = load();
    const i = db.avatars.findIndex((x) => x.id === a.id);
    if (i >= 0) db.avatars[i] = a;
    else db.avatars.push({ ...a, id: "av" + Date.now() });
    save(db);
  },
  removeAvatar(id: string) {
    const db = load();
    db.avatars = db.avatars.filter((x) => x.id !== id);
    save(db);
  },
};

// 简单"管理员会话"
export function isLoggedIn() {
  return localStorage.getItem("xunmi_admin_session") === "1";
}
export function login(username: string, password: string): boolean {
  // Demo 账号
  if (username && password.length >= 3) {
    localStorage.setItem("xunmi_admin_session", "1");
    localStorage.setItem("xunmi_admin_user", username);
    return true;
  }
  return false;
}
export function logout() {
  localStorage.removeItem("xunmi_admin_session");
  localStorage.removeItem("xunmi_admin_user");
}
export function currentUser() {
  return localStorage.getItem("xunmi_admin_user") || "admin";
}
