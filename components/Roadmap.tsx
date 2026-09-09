"use client";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { lessonById, lessons, modules, allTaskKeys } from "@/content/curriculum";
import { counts, getProgress, lessonStatus, type Progress } from "@/lib/storage";
import { emptyStudy, getStudy, topicComplete } from "@/lib/material-progress";
import { CourseArt } from "./CourseArt";
function quantity(n:number, forms:[string,string,string]) { const k=n%100; return `${n} ${forms[k>=11&&k<=14?2:n%10===1?0:n%10>=2&&n%10<=4?1:2]}`; }
export function Roadmap({ moduleId }: { moduleId?: string }) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [group,setGroup] = useState("all");
  const [selected,setSelected] = useState<number | null>(null);
  useEffect(()=>{ if(selected !== null) dialogRef.current?.showModal(); },[selected]);
  const [study,setStudy] = useState(emptyStudy);
  const [p, setP] = useState<Progress>({ tasks: {}, qotd: {} });
  useEffect(() => { const sync = () => {setP(getProgress());setStudy(getStudy());}; sync(); window.addEventListener("focus",sync); window.addEventListener("py-term-progress",sync); return () => { window.removeEventListener("focus",sync); window.removeEventListener("py-term-progress",sync); }; }, []);
  const status = (id:string) => topicComplete(lessonById[id],study,p) ? "done" : lessonStatus(id, lessonById[id].tasks.map(t=>t.id), p.tasks)==="empty" && !(lessonById[id].resources||[]).some(r=>study.materials[`${id}:${r.id}`]) ? "empty" : "started";
  const completed = counts(p.tasks, allTaskKeys());
  const current = lessons.find(l=>status(l.id)!=="done") ?? lessons[0];
  const index = modules.findIndex(m=>m.id===moduleId);
  if (index >= 0) { const m=modules[index]; return <main className="learning-home module-detail"><Link className="back-link" href="/app">← Моё обучение</Link><header className="module-overview" data-color={index % 3}><div><p className="eyebrow">{m.id} / КУРС</p><h1>{m.title}</h1><p>{m.blurb.replaceAll("`", "")}</p><span>{quantity(m.lessonIds.length,["тема","темы","тем"])} · {m.lessonIds.reduce((n,id)=>n+(lessonById[id].resources?.length??0),0)} материалов</span></div><CourseArt index={index}/></header><ModuleOutline ids={m.lessonIds} study={study} progress={p}/></main>; }
  return <main className="learning-home compact-home"><div className="learning-heading"><h1>Моё обучение</h1><Link href="/app/qotd" className="daily-shortcut">Вопрос дня ↗</Link></div>
    <section className="workspace-stats" aria-label="Прогресс обучения"><div><span>Задачи</span><strong>{completed.done}<small> / {completed.total}</small></strong></div><div><span>Темы пройдены</span><strong>{lessons.filter(l=>status(l.id)==="done").length}<small> / {lessons.length}</small></strong></div><Link href={`/app/lesson/${current.id}`} className="resume-widget"><span>Продолжить</span><strong>{current.title}</strong><b aria-hidden="true">↗</b></Link></section>
    <div className="section-caption"><h2>Модули</h2><span>{quantity(modules.length,["модуль","модуля","модулей"])} · {quantity(lessons.length,["тема","темы","тем"])}</span></div><div className="curriculum-filters" aria-label="Направление курса">{[["all","Все"],["P","Python"],["D","Данные"],["ML","ML"],["CV","Зрение"],["X","Дополнительно"]].map(([id,label])=><button key={id} aria-pressed={group===id} onClick={()=>setGroup(id)}>{label}</button>)}</div><div className="course-grid">{modules.filter(m=>group==="all" || m.id.startsWith(group)).map((m,i)=>{const done=m.lessonIds.filter(id=>status(id)==="done").length;return <button type="button" aria-haspopup="dialog" className="course-card" data-color={modules.indexOf(m) % 3} onClick={()=>setSelected(modules.indexOf(m))} key={m.id}><div className="course-cover"><span>{m.id}</span><CourseArt index={modules.indexOf(m)}/><b aria-hidden="true">↗</b></div><div className="course-card-body"><h3>{m.title}</h3><p>{m.blurb.replaceAll("`", "")}</p><div className="course-card-meta"><span>{quantity(m.lessonIds.length,["тема","темы","тем"])}</span><span>{done}/{m.lessonIds.length} пройдено</span></div><div className="course-meter"><i style={{width:`${done/m.lessonIds.length*100}%`}}/></div></div></button>})}</div>
    <dialog ref={dialogRef} className="module-dialog" aria-labelledby="module-dialog-title" onClose={()=>setSelected(null)} onClick={e=>{if(e.target===e.currentTarget){const r=e.currentTarget.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)e.currentTarget.close();}}}>{selected !== null && <><header><span>Модуль {selected+1}</span><button autoFocus aria-label="Закрыть темы" onClick={()=>dialogRef.current?.close()}>×</button></header><h2 id="module-dialog-title">{modules[selected].title}</h2><ModuleOutline ids={modules[selected].lessonIds} study={study} progress={p}/></>}</dialog>
    </main>;
}

function ModuleOutline({ids,study,progress}:{ids:string[];study:ReturnType<typeof emptyStudy>;progress:Progress}) {
 return <div className="module-outline">
 <section className="outline-zone lectures-zone"><div className="outline-zone-heading"><b>01</b><div><h3>Лекции</h3><p>Посмотрите материалы и отметьте изученное</p></div></div>{ids.map((id,i)=>{const l=lessonById[id],done=(l.resources??[]).every(r=>study.materials[`${id}:${r.id}`]);return <Link className="outline-row" key={id} href={`/app/lesson/${id}#materials`}><span>{i+1}.</span><span>{l.title}<small>{quantity(l.resources?.length??0,["материал","материала","материалов"])}</small></span><span className={done?'outline-done':''} aria-label={done?'Изучено':'Ещё не изучено'}>{done?'✓✓':'✓'}</span></Link>;})}</section>
 <section className="outline-zone practice-zone"><div className="outline-zone-heading"><b>02</b><div><h3>Практика</h3><p>Решите задания в редакторе Python</p></div></div>{ids.flatMap(id=>lessonById[id].tasks.map((t,i)=>{const done=['solved','solved_hinted'].includes(progress.tasks[`${id}::${t.id}`]);return <Link className="outline-row" key={t.id} href={`/app/lesson/${id}#practice/${t.id}`}><span>{i+1}.</span><span>{t.title}<small>{i===lessonById[id].tasks.length-1?'Итоговое задание':lessonById[id].title}</small></span><span className={done?'outline-done':''}>{done?'✓':'→'}</span></Link>;}))}</section>
 <section className="outline-zone leetcode-zone"><div className="outline-zone-heading"><b>03</b><div><h3>LeetCode</h3><p>Потренируйте алгоритмы и прикрепите результат</p></div></div>{ids.flatMap(id=>(lessonById[id].challenges??[]).map(c=><Link className="outline-row" key={id+c.id} href={`/app/lesson/${id}#leetcode`}><span className={`difficulty-${c.difficulty.toLowerCase()}`}>{c.difficulty}</span><span>{c.title}<small>{lessonById[id].title}</small></span><span className="outline-done">{study.evidence[`${id}:${c.id}`]?'✓':'→'}</span></Link>))}</section>
 </div>;
}
