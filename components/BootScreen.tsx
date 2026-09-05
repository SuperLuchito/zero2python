"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

const LINES = [
  "консоль не учит. она проверяет, врёшь ли ты себе.",
  "интерпретатор в браузере. pandas — по вызову, не сразу.",
  "урок короткий. практика тут. вопрос дня — отдельно и злой.",
  "прогресс только в этом браузере. аккаунта нет.",
  "",
  "enter / клик — войти.",
];

export function BootScreen() {
  const router = useRouter();
  const full = useMemo(() => LINES.join("\n"), []);
  const [n, setN] = useState(0);
  const done = n >= full.length;

  useEffect(() => {
    if (done) return;
    const ch = full[n];
    const delay = ch === "\n" ? 90 : ch === "." ? 40 : 18;
    const t = setTimeout(() => setN((x) => x + 1), delay);
    return () => clearTimeout(t);
  }, [n, done, full]);

  useEffect(() => {
    const go = () => router.push("/app");
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Enter") go();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [router]);

  const shown = full.slice(0, n);

  return (
    <div className="boot-wrap" onClick={() => router.push("/app")}>
      <div className="frame boot">
        <div className="boot-meta">
          <span>session 001</span>
          <span>local / no auth</span>
        </div>
        <pre>
          {shown}
          <span className="cursor" />
        </pre>
        <div className="boot-meta">
          <span>utf-8 · python · ru</span>
          <span>{done ? "ready" : "boot"}</span>
        </div>
      </div>
    </div>
  );
}
