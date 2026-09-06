"use client";

import { useEffect, useMemo, useState } from "react";
import { dayKey, qotdForDate } from "@/content/qotd";
import Link from "next/link";
import { highlightPython } from "@/lib/highlight";
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

  const parts = q.prompt.split("\n\n");
  const code = q.id === "chained-cmp" ? "print(False == False in [False])" : parts.length > 1 ? parts.slice(1).join("\n\n") : q.prompt;
  const proseOnly = q.id === "pandas-add";
  return <main className="daily-page">
    <header className="daily-header"><div><p className="eyebrow">ЕЖЕДНЕВНАЯ ПРАКТИКА МЫШЛЕНИЯ</p><h1>А что выведет <em>Python?</em></h1><p>Небольшой вопрос. Неочевидная деталь. Ещё одно открытие.</p></div><div className="daily-stamp"><span aria-hidden="true">✳</span><time dateTime={key}>{now.toLocaleDateString("ru-RU",{day:"numeric",month:"long"})}</time></div></header>
    <div className="daily-layout"><section className="daily-question"><div className="daily-question-meta"><span>РАЗМИНКА / PYTHON</span><span>01 вопрос</span></div><h2>{q.title}</h2><p>{parts.length > 1 ? parts[0] : "Прочитайте внимательно и предположите результат. Попробуйте сначала без запуска."}</p><div className="daily-code"><div><span>challenge.py</span><span>Python</span></div>{proseOnly ? <p>{q.prompt}</p> : <pre><code dangerouslySetInnerHTML={{__html:highlightPython(code)}}/></pre>}</div><aside className="daily-note"><span aria-hidden="true">↳</span><p>Сначала своя версия, потом объяснение.<br />Так детали запоминаются лучше.</p></aside></section>
    <section className="daily-answer"><h2>{locked ? "Результат разминки" : "Ваша версия"}</h2><p className="dim">{locked ? "Ответ сохранён. Следующий вопрос — завтра." : "Выберите один вариант ответа"}</p><div className="qotd-choices">{q.choices.map((c,i)=><button key={c} aria-pressed={picked===i} className={[picked===i ? "picked" : "", locked && i===q.answer ? "correct" : "",locked && picked===i && !ok ? "incorrect" : ""].join(" ")} onClick={()=>choose(i)} disabled={locked}><span className="choice-letter">{String.fromCharCode(65+i)}</span><code>{c}</code><span className="choice-indicator" aria-hidden="true">{locked && i===q.answer ? "✓" : picked===i ? "●" : "○"}</span></button>)}</div>
    {!locked ? <button className="daily-submit" disabled={picked===null} onClick={commit}>Проверить мою версию <span>→</span></button> : <div className={`daily-feedback ${ok ? "success" : "retry"}`} role="status"><h3><span aria-hidden="true">{ok ? "✦" : "↳"}</span> {ok ? "Точно! Вы заметили деталь." : "Здесь есть неожиданный поворот."}</h3><p><strong>На что обратить внимание:</strong> {q.trap}</p><p>{q.debrief}</p><Link href="/app">Вернуться к обучению →</Link></div>}
    </section></div></main>;
}
