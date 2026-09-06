"use client";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { lessonById, lessons, modules, allTaskKeys } from "@/content/curriculum";
import { counts, getProgress, lessonStatus, type Progress } from "@/lib/storage";
import { CourseArt } from "./CourseArt";
const titles = ["Основы Python", "Анализ данных", "Алгоритмы"];
const descriptions = ["Объекты, функции, коллекции", "pandas, индексы, groupby, CSV", "Границы, хеширование, жадные алгоритмы"];
export function Roadmap({ moduleId }: { moduleId?: string }) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [selected,setSelected] = useState<number | null>(null);
  useEffect(()=>{ if(selected !== null) dialogRef.current?.showModal(); },[selected]);
  const [p, setP] = useState<Progress>({ tasks: {}, qotd: {} });
  useEffect(() => { const sync = () => setP(getProgress()); sync(); window.addEventListener("focus",sync); window.addEventListener("py-term-progress",sync); return () => { window.removeEventListener("focus",sync); window.removeEventListener("py-term-progress",sync); }; }, []);
  const status = (id:string) => lessonStatus(id, lessonById[id].tasks.map(t=>t.id), p.tasks);
  const completed = counts(p.tasks, allTaskKeys());
  const current = lessons.find(l=>status(l.id)!=="done") ?? lessons[0];
  const index = modules.findIndex(m=>m.id===moduleId);
  if (index >= 0) { const m=modules[index]; return <main className="learning-home module-detail"><Link className="back-link" href="/app">← Моё обучение</Link><header className="module-overview" data-color={index}><div><p className="eyebrow">МОДУЛЬ 0{index+1} / PYTHON</p><h1>{titles[index]}</h1><p>{descriptions[index]}</p><span>{m.lessonIds.length} темы · {m.lessonIds.reduce((n,id)=>n+lessonById[id].minutes,0)} минут практики и теории</span></div><CourseArt index={index}/></header><div className="section-caption"><h2>Темы модуля</h2><span>Теория → практика → разбор</span></div><div className="topic-list">{m.lessonIds.map((id,i)=><Link className="topic-link" key={id} href={`/app/lesson/${id}`}><span className="topic-index">{String(i+1).padStart(2,"0")}</span><div><h3>{lessonById[id].title}</h3><p>{lessonById[id].minutes} мин · {lessonById[id].tasks.length} задания</p></div><span className="topic-state">{status(id)==="done" ? "✓ Пройдено" : status(id)==="empty" ? "Начать" : "Продолжить"} ↗</span></Link>)}</div></main>; }
  return <main className="learning-home compact-home"><div className="learning-heading"><h1>Моё обучение</h1><Link href="/app/qotd" className="daily-shortcut">Вопрос дня ↗</Link></div>
    <section className="workspace-stats" aria-label="Прогресс обучения"><div><span>Задачи</span><strong>{completed.done}<small> / {completed.total}</small></strong></div><div><span>Темы пройдены</span><strong>{lessons.filter(l=>status(l.id)==="done").length}<small> / {lessons.length}</small></strong></div><Link href={`/app/lesson/${current.id}`} className="resume-widget"><span>Продолжить</span><strong>{current.title}</strong><b aria-hidden="true">↗</b></Link></section>
    <div className="section-caption"><h2>Модули</h2><span>{modules.length} модуля · {lessons.length} тем</span></div><div className="course-grid">{modules.map((m,i)=>{const done=m.lessonIds.filter(id=>status(id)==="done").length;return <button type="button" aria-haspopup="dialog" className="course-card" data-color={i} onClick={()=>setSelected(i)} key={m.id}><div className="course-cover"><span>МОДУЛЬ 0{i+1}</span><CourseArt index={i}/><b aria-hidden="true">↗</b></div><div className="course-card-body"><h3>{titles[i]}</h3><p>{descriptions[i]}</p><div className="course-card-meta"><span>{m.lessonIds.length} темы</span><span>{done}/{m.lessonIds.length} пройдено</span></div><div className="course-meter"><i style={{width:`${done/m.lessonIds.length*100}%`}}/></div></div></button>})}</div>
    <dialog ref={dialogRef} className="module-dialog" aria-labelledby="module-dialog-title" onClose={()=>setSelected(null)} onClick={e=>{if(e.target===e.currentTarget){const r=e.currentTarget.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)e.currentTarget.close();}}}>{selected !== null && <><header><span>Модуль {selected+1}</span><button autoFocus aria-label="Закрыть темы" onClick={()=>dialogRef.current?.close()}>×</button></header><h2 id="module-dialog-title">{titles[selected]}</h2><p>Темы и задания</p><div className="topic-list">{modules[selected].lessonIds.map((id,i)=><Link key={id} className="topic-link" href={`/app/lesson/${id}`}><span className="topic-index">{i+1}.</span><div><h3>{lessonById[id].title}</h3><p>{lessonById[id].minutes} мин · {lessonById[id].tasks.length} задания</p></div><span className="topic-state">{status(id)==="done" ? "✓" : "↗"}</span></Link>)}</div></>}</dialog>
    </main>;
}
