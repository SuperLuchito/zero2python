"use client";

import { useEffect, useMemo, useState } from "react";
import { dayKey, qotdForDate } from "@/content/qotd";
import { getProgress, markQotd } from "@/lib/storage";

export function QotdView() {
  const now = useMemo(() => new Date(), []);
  const q = useMemo(() => qotdForDate(now), [now]);
  const key = useMemo(() => dayKey(now), [now]);
  const [picked, setPicked] = useState<number | null>(null);
  const [locked, setLocked] = useState(false);
  const [ok, setOk] = useState(false);

  useEffect(() => {
    const prev = getProgress().qotd[key];
    if (prev && prev.qid === q.id) {
      setLocked(true);
      setOk(prev.ok);
    }
  }, [key, q.id]);

  function choose(i: number) {
    if (locked) return;
    setPicked(i);
  }

  function commit() {
    if (picked === null || locked) return;
    const good = picked === q.answer;
    markQotd(key, q.id, good);
    setOk(good);
    setLocked(true);
    window.dispatchEvent(new Event("py-term-progress"));
  }

  return (
    <div className="shell">
      <p className="mute" style={{ letterSpacing: "0.14em", fontSize: 11 }}>
        вопрос дня · {key} · не из текущего урока
      </p>
      <h1>{q.title}</h1>
      <pre className="prose" style={{ whiteSpace: "pre-wrap" }}>
        {q.prompt}
      </pre>
      <div className="qotd-choices">
        {q.choices.map((c, i) => (
          <button
            key={c}
            className={picked === i ? "picked" : ""}
            onClick={() => choose(i)}
            disabled={locked}
          >
            {String.fromCharCode(65 + i)}. {c}
          </button>
        ))}
      </div>
      {!locked ? (
        <button disabled={picked === null} onClick={commit}>
          зафиксировать
        </button>
      ) : (
        <div className="debrief">
          <p className={ok ? "ok" : "fail"}>{ok ? "попал." : "мимо."}</p>
          <p>
            <b>ловушка:</b> {q.trap}
          </p>
          <p>{q.debrief}</p>
        </div>
      )}
    </div>
  );
}
