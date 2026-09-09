"use client";

import Link from "next/link";
import { Logo } from "./Logo";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { allTaskKeys } from "@/content/curriculum";
import { counts, getProgress } from "@/lib/storage";

export function ProgressStrip() {
  const pathname = usePathname();
  const [done, setDone] = useState(0);
  const [hinted, setHinted] = useState(0);
  const total = allTaskKeys().length;

  useEffect(() => {
    const sync = () => {
      const p = getProgress();
      const c = counts(p.tasks, allTaskKeys());
      setDone(c.done);
      setHinted(c.hinted);
    };
    sync();
    window.addEventListener("focus", sync);
    window.addEventListener("storage", sync);
    window.addEventListener("py-term-progress", sync);
    return () => {
      window.removeEventListener("focus", sync);
      window.removeEventListener("storage", sync);
      window.removeEventListener("py-term-progress", sync);
    };
  }, []);

  const pct = total ? Math.round((done / total) * 100) : 0;

  return (
    <nav className="strip" aria-label="Главная навигация">
      <Link className="brand" href="/" aria-label="zero2python — главная"><Logo/></Link>
      <Link href="/app" aria-current={pathname === "/app" || pathname.startsWith("/app/lesson") || pathname.startsWith("/app/module") ? "page" : undefined}><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 5h6l3 2 3-2h6v15h-6l-3 2-3-2H3zM12 7v15"/></svg><span>Моё обучение</span></Link>
      <Link href="/app/qotd" aria-current={pathname === "/app/qotd" ? "page" : undefined}><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 18h6m-5 3h4M8 14a7 7 0 1 1 8 0l-1 2H9z"/></svg><span>Вопрос дня</span></Link>
      <Link href="/app/book" aria-current={pathname.startsWith('/app/book')?'page':undefined}><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 3h15v18H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2Zm0 14h15M8 7h8M8 11h6"/></svg><span>Нейросети</span></Link>
      <Link href="/app/university" aria-current={pathname.startsWith('/app/university')?'page':undefined}><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m2 8 10-5 10 5-10 5ZM6 10v7l6 3 6-3v-7M22 8v9"/></svg><span>Анализ данных</span></Link>
      <Link href="/app/leaderboard" aria-current={pathname.startsWith('/app/leaderboard')?'page':undefined}><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 21V11h6v10M9 21V4h6v17M15 21V8h6v13"/></svg><span>Лидерборд</span></Link>
      <span className="grow dim">
        задачи {done}/{total}
        {hinted ? ` · подсказок ${hinted}` : ""}
      </span>
      <span>
        <i className="bar" aria-hidden>
          <i style={{ width: `${pct}%` }} />
        </i>
      </span>
    </nav>
  );
}
