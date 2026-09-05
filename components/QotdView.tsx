"use client";
import { useEffect, useMemo, useState } from "react";
import { dayKey, qotdForDate } from "@/content/qotd";
import { markQotd } from "@/lib/storage";
import { useProgress } from "./ProgressProvider";
export function QotdView() {
  const now = useMemo(() => new Date(), []),
    q = useMemo(() => qotdForDate(now), [now]),
    key = dayKey(now);
  const { progress, ready, user } = useProgress();
  const [picked, setPicked] = useState<number | null>(null);
  const prev = progress.qotd[key],
    locked = prev?.qid === q.id;
  useEffect(() => setPicked(null), [user?.id]);
  return (
    <div className="shell">
      <p className="eyebrow">Вопрос дня · {key} · самостоятельная практика</p>
      <h1>{q.title}</h1>
      {!ready ? (
        <p role="status">Загружаем прогресс…</p>
      ) : (
        <>
          <pre className="prose" style={{ whiteSpace: "pre-wrap" }}>
            {q.prompt}
          </pre>
          <div className="qotd-choices">
            {q.choices.map((c, i) => (
              <button
                key={c}
                className={picked === i ? "picked" : ""}
                aria-pressed={picked === i}
                onClick={() => setPicked(i)}
                disabled={locked}
              >
                {String.fromCharCode(65 + i)}. {c}
              </button>
            ))}
          </div>
          {!locked ? (
            <button
              disabled={picked === null}
              onClick={() => {
                if (picked !== null) markQotd(key, q.id, picked === q.answer);
              }}
            >
              Зафиксировать
            </button>
          ) : (
            <div className="debrief">
              <p className={prev.ok ? "ok" : "fail"}>
                {prev.ok ? "Верно." : "Попробуйте разобраться в объяснении."}
              </p>
              <p>
                <b>Ловушка:</b> {q.trap}
              </p>
              <p>{q.debrief}</p>
            </div>
          )}
        </>
      )}
    </div>
  );
}
