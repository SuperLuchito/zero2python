"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { allTaskKeys } from "@/content/curriculum";
import { counts, getProgress } from "@/lib/storage";

export function ProgressStrip() {
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
    <nav className="strip">
      <Link href="/app">карта</Link>
      <Link href="/app/qotd">вопрос дня</Link>
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
