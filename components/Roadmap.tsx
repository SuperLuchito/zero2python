"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { lessonById, lessons, modules } from "@/content/curriculum";
import { getProgress, lessonStatus } from "@/lib/storage";
import type { Progress } from "@/lib/storage";

const LABEL: Record<string, string> = {
  empty: "—",
  partial: "в работе",
  hinted: "подсказка",
  done: "закрыт",
};

export function Roadmap() {
  const [p, setP] = useState<Progress>({ tasks: {}, qotd: {} });
  useEffect(() => setP(getProgress()), []);

  return (
    <div className="shell">
      <h1>карта</h1>
      <p className="dim prose">
        База коротко, потом pandas, потом ямы. Вопрос дня не из текущего урока —
        он сам по себе, каждый календарный день один.
      </p>
      <div className="modules" style={{ marginTop: 24 }}>
        {modules.map((m) => (
          <section key={m.id} className="frame module">
            <header>
              <span>{m.title}</span>
              <span className="dim">{m.blurb}</span>
            </header>
            {m.lessonIds.map((id) => {
              const l = lessonById[id];
              const st = lessonStatus(
                l.id,
                l.tasks.map((t) => t.id),
                p.tasks,
              );
              return (
                <Link key={id} href={`/app/lesson/${id}`} className="lesson-row">
                  <span className="mute">{l.minutes} мин</span>
                  <span>
                    {l.title}
                    {l.needsPandas ? (
                      <span className="dim"> · pandas</span>
                    ) : null}
                  </span>
                  <span className={`status ${st === "done" ? "ok" : "dim"}`}>
                    {LABEL[st]}
                  </span>
                </Link>
              );
            })}
          </section>
        ))}
      </div>
      <p className="mute" style={{ marginTop: 28, fontSize: 12 }}>
        уроков {lessons.length} · задач {lessons.reduce((n, l) => n + l.tasks.length, 0)}
      </p>
    </div>
  );
}
