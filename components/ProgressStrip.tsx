"use client";

import Link from "next/link";
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
      <Link className="brand" href="/" aria-label="zero2python — главная"><b aria-hidden="true">z<span>2</span></b><strong>zero2python</strong></Link>
      <Link href="/app" aria-current={pathname === "/app" || pathname.startsWith("/app/lesson") || pathname.startsWith("/app/module") ? "page" : undefined}><i aria-hidden="true">◇</i> Моё обучение</Link>
      <Link href="/app/qotd" aria-current={pathname === "/app/qotd" ? "page" : undefined}><i aria-hidden="true">✳</i> Вопрос дня</Link>
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
