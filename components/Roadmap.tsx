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
    <div className="shell roadmap-shell">
      <header className="roadmap-intro">
        <div><p className="eyebrow">ВАША ЛАБОРАТОРИЯ ЗНАНИЙ</p><h1>От любопытства<br />к <em>первой программе.</em></h1>
        <p className="dim prose">Одна тема, небольшой эксперимент, новый навык.<br />Выберите урок и попробуйте идею в коде.</p></div>
        <div className="roadmap-art" aria-hidden="true"><span className="art-star">✳</span><span className="art-code">[ идея ]<br /><b>↓</b><br />{"{ код }"}</span><span className="art-dot" /></div>
      </header>
      <div className="modules" style={{ marginTop: 24 }}>
        {modules.map((m, index) => (
          <section key={m.id} className="frame module" data-tone={index % 3}>
            <header>
              <span className="module-title"><b className="module-number">0{index + 1}</b>{m.title}</span>
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
