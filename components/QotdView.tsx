"use client";

import { useEffect, useMemo, useState } from "react";
import { dayKey, qotdForDate } from "@/content/qotd";
import Link from "next/link";
import { CodeFrame, TracePlayer } from "./TracePlayer";
import { bootPython, runOpen, type RunResult } from "@/lib/pyodide";
import { getProgress, markQotd } from "@/lib/storage";

export function QotdView() {
  const [now,setNow]=useState<Date|null>(null);
  useEffect(()=>setNow(new Date()),[]);
  return now?<DailyQuestion now={now}/>:<main className="daily-page"><p role="status">Открываем вопрос дня…</p></main>;
}
function DailyQuestion({now}:{now:Date}) {
  const q = useMemo(() => qotdForDate(now), [now]);
  const key = useMemo(() => dayKey(now), [now]);
  const [picked, setPicked] = useState<number | null>(null);
  const [locked, setLocked] = useState(false);
  const [trace,setTrace]=useState<RunResult|null>(null);
  const [traceError,setTraceError]=useState("");
  const [retry,setRetry]=useState(0);
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
  const executable = q.id==='pandas-add'?'import pandas as pd\na = pd.Series([1, 2], index=[0, 1])\nb = pd.Series([10, 20], index=[1, 2])\nprint(a + b)':code;
  useEffect(()=>{if(!locked)return;let live=true;setTraceError("");(async()=>{try{await bootPython(q.id==='pandas-add'?['pandas']:[],()=>{});const r=await runOpen(executable);if(live)setTrace(r);}catch(e){if(live)setTraceError("Не удалось загрузить Python для пошагового разбора. Проверьте соединение и повторите попытку.");}})();return()=>{live=false;};},[locked,executable,q.id,retry]);
  return <main className="daily-page">
    <header className="daily-header"><h1>Вопрос дня</h1><time dateTime={key}>{now.toLocaleDateString("ru-RU",{day:"numeric",month:"long"})}</time></header>
    <div className="daily-layout"><section className="daily-question"><div className="daily-question-meta"><span>РАЗМИНКА / PYTHON</span><span>01 вопрос</span></div><h2>{q.title}</h2><p>{parts.length > 1 ? parts[0] : "Что выведет этот код?"}</p><CodeFrame code={executable}/></section>
    <section className="daily-answer"><h2>{locked ? "Результат разминки" : "Ваша версия"}</h2><p className="dim">{locked ? "Ответ сохранён. Следующий вопрос — завтра." : "Выберите один вариант ответа"}</p><div className="qotd-choices">{q.choices.map((c,i)=><button key={c} aria-pressed={picked===i} className={[picked===i ? "picked" : "", locked && i===q.answer ? "correct" : "",locked && picked===i && !ok ? "incorrect" : ""].join(" ")} onClick={()=>choose(i)} disabled={locked}><span className="choice-letter">{String.fromCharCode(65+i)}</span><code>{c}</code><span className="choice-indicator" aria-hidden="true">{locked && i===q.answer ? "✓" : picked===i ? "●" : "○"}</span></button>)}</div>
    {!locked ? <button className="daily-submit" disabled={picked===null} onClick={commit}>Проверить мою версию <span>→</span></button> : <div className={`daily-feedback ${ok ? "success" : "retry"}`} role="status"><h3><span aria-hidden="true">{ok ? "✦" : "↳"}</span> {ok ? "Верно" : "Неверно · смотрите разбор"}</h3>{trace?<TracePlayer code={executable} steps={trace.trace??[]} truncated={trace.traceTruncated}/>:<div><p role="status">{traceError||'Готовим пошаговое выполнение Python…'}</p>{traceError&&<button onClick={()=>setRetry(n=>n+1)}>Повторить загрузку отладчика</button>}</div>}<details className="text-explanation"><summary>Объяснение словами</summary><p>{q.trap}</p><p>{q.debrief}</p></details><Link href="/app">Вернуться к обучению →</Link></div>}
    </section></div></main>;
}
