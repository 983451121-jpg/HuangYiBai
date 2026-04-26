import { useEffect, useState } from "react";

type Toast = { id: number; msg: string };
let push: ((m: string) => void) | null = null;
export function showToast(msg: string) {
  push?.(msg);
}

export function ToastHost() {
  const [list, setList] = useState<Toast[]>([]);
  useEffect(() => {
    push = (msg: string) => {
      const id = Date.now() + Math.random();
      setList((l) => [...l, { id, msg }]);
      setTimeout(() => setList((l) => l.filter((t) => t.id !== id)), 2400);
    };
    return () => {
      push = null;
    };
  }, []);
  return (
    <div className="fixed top-6 right-6 z-[100] flex flex-col gap-2 pointer-events-none">
      {list.map((t) => (
        <div
          key={t.id}
          className="liquid-glass px-5 py-3 rounded-2xl text-sm text-foreground animate-fade-rise"
          style={{ animationDuration: "0.3s" }}
        >
          {t.msg}
        </div>
      ))}
    </div>
  );
}
