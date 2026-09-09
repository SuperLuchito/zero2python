"use client";
import {profileKey,currentProfile} from "@/lib/account";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { variableSuggestions } from "@/lib/python-completion";
import { TracePlayer } from "./TracePlayer";
import { TopicMaterials } from "./TopicMaterials";
import { Markdown } from "./Markdown";

import { highlightPython } from "@/lib/highlight";
import type { Lesson, TaskMark } from "@/lib/types";
import { getProgress, markTask, taskKey } from "@/lib/storage";
import { explainPythonError } from "@/lib/python-diagnostic";
import { bootPython, runOpen, runTests, type RunResult } from "@/lib/pyodide";

function ping() {
  window.dispatchEvent(new Event("py-term-progress"));
}

export function LessonView({ lesson }: { lesson: Lesson }) {
  const [stage,setStage]=useState<'materials'|'practice'|'leetcode'>('materials');
  const [initialTask,setInitialTask]=useState(0);
  useEffect(()=>{const sync=()=>{const [part,id]=location.hash.slice(1).split('/');setStage(part==='practice'||part==='leetcode'?part:'materials');setInitialTask(Math.max(0,lesson.tasks.findIndex(t=>t.id===id)));};sync();window.addEventListener('hashchange',sync);return()=>window.removeEventListener('hashchange',sync);},[lesson]);
  function go(next:'materials'|'practice'|'leetcode'){setStage(next);history.replaceState(null,'',`#${next}`);window.scrollTo(0,0);}
  return stage==='practice' ? <PracticeView key={lesson.id+initialTask} initialTask={initialTask} lesson={lesson} onMaterials={()=>go('materials')} onLeetcode={()=>go('leetcode')}/> : <TopicMaterials key={lesson.id+stage} section={stage} lesson={lesson} onPractice={()=>go('practice')}/>;
}

function PracticeView({ lesson, onMaterials,onLeetcode,initialTask }: { lesson: Lesson; onMaterials: () => void;onLeetcode:()=>void;initialTask:number }) {
  const [idx, setIdx] = useState(initialTask);
  const task = lesson.tasks[idx];
  const [code, setCode] = useState(task.starter);
  const [log, setLog] = useState("idle.");
  const [busy, setBusy] = useState(false);
  const [ready, setReady] = useState(false);
  const [bootError,setBootError]=useState(false);
  const [showHint, setShowHint] = useState(false);
  const [hintLevel,setHintLevel] = useState(0);
  const [images,setImages] = useState<string[]>([]);
  const [showDebrief, setShowDebrief] = useState(false);
  const [mark, setMark] = useState<TaskMark>("untouched");
  const [result,setResult] = useState<RunResult|null>(null);
  const [runKind,setRunKind] = useState<"tests"|"open">("open");
  const [editorScroll,setEditorScroll] = useState(0);
  const [lineHeight,setLineHeight] = useState(30.6);
  const editorRef = useRef<HTMLTextAreaElement>(null);
  const highlightRef = useRef<HTMLPreElement>(null);
  const gutterRef = useRef<HTMLDivElement>(null);
  const [runNumber, setRunNumber] = useState(0);
  const [runCycle,setRunCycle] = useState(0);
  const [suggestions,setSuggestions]=useState<string[]>([]);
  const [suggested,setSuggested]=useState(0);
  const [activeTop,setActiveTop] = useState(22);
  function updateLine(el: HTMLTextAreaElement) { const style=getComputedStyle(el); const line=el.value.slice(0,el.selectionStart).split("\n").length-1; setActiveTop(parseFloat(style.paddingTop)+line*parseFloat(style.lineHeight)-el.scrollTop);setEditorScroll(el.scrollTop);setLineHeight(parseFloat(style.lineHeight)); }

  const keys = useMemo(
    () => lesson.tasks.map((t) => taskKey(lesson.id, t.id)),
    [lesson],
  );

  const loadMark = useCallback(() => {
    const p = getProgress();
    setMark(p.tasks[taskKey(lesson.id, task.id)] ?? "untouched");
  }, [lesson.id, task.id]);

  useEffect(() => {
    setCode(localStorage.getItem(profileKey(`z2p-code:${lesson.id}:${task.id}`)) ?? (currentProfile()==='Lukyan'?localStorage.getItem(`z2p-code:${lesson.id}:${task.id}`):null) ?? task.starter);
    setImages([]);setHintLevel(0);setSuggestions([]);
    setActiveTop(22);
    for (const el of [editorRef.current, highlightRef.current, gutterRef.current]) { if (el) { el.scrollTop = 0; el.scrollLeft = 0; } }
    setLog("idle.");
    setResult(null);
    const p = getProgress();
    const m = p.tasks[taskKey(lesson.id, task.id)] ?? "untouched";
    setMark(m);
    setShowHint(m === "hinted" || m === "solved_hinted");
    setHintLevel(m === "hinted" || m === "solved_hinted" ? 1 : 0);
    setShowDebrief(m === "solved" || m === "solved_hinted" || m === "gave_up");
  }, [task, loadMark]);

  useEffect(() => {
    let live = true;
    (async () => {
      try {
        await bootPython(lesson.packages ?? lesson.needsPandas, (s) => {
          if (live) setLog((prev) => (prev === "idle." ? s : prev + "\n" + s));
        });
        if (live) setReady(true);
      } catch (e) {
        if (live) {setBootError(true);setLog(e instanceof Error ? e.message : String(e));}
      }
    })();
    return () => {
      live = false;
    };
  }, [lesson.needsPandas,lesson.packages]);

  async function onRun(kind: "tests" | "open") {
    if (!ready || busy) return;
    setBusy(true);
    setRunCycle(n=>n+1);setRunKind(kind);
    setResult(null);
    setLog("Выполняется…");setImages([]);
    try {
      const res =
        kind === "tests"
          ? await runTests(code, task.tests)
          : await runOpen(code);
      setImages(res.images);
      setResult(res);
      setRunNumber(n => n + 1);
      setLog("");
      if (kind === "tests" && res.ok) {
        const next = markTask(lesson.id, task.id, "solved");
        setMark(next.tasks[taskKey(lesson.id, task.id)]);
        setShowDebrief(true);
        ping();
      }
    } catch (e) {
      const message=e instanceof Error ? e.message : String(e);
      setResult({ok:false,stdout:'',error:message,images:[],diagnostic:{name:'Выполнение остановлено',message,line:null}});setLog('');
    } finally {
      setBusy(false);
    }
  }

  function focusError() {
    const el=editorRef.current;const line=result?.diagnostic?.line;if(!el||!line)return;
    const start=code.split("\n").slice(0,line-1).reduce((n,s)=>n+s.length+1,0);
    el.focus();el.setSelectionRange(start,start);
    el.scrollTop=Math.max(0,(line-3)*lineHeight);updateLine(el);
    if(highlightRef.current)highlightRef.current.scrollTop=el.scrollTop;
    if(gutterRef.current)gutterRef.current.scrollTop=el.scrollTop;
  }

  function acceptVariable(name:string) {
    const el=editorRef.current;if(!el)return;
    const caret=el.selectionStart,prefix=code.slice(0,caret).match(/[A-Za-z_]\w*$/)?.[0]??'';
    const next=code.slice(0,caret-prefix.length)+name+code.slice(caret);
    setCode(next);setResult(null);setSuggestions([]);localStorage.setItem(profileKey(`z2p-code:${lesson.id}:${task.id}`),next);
    requestAnimationFrame(()=>{el.focus();el.setSelectionRange(caret-prefix.length+name.length,caret-prefix.length+name.length);});
  }
  function onHint() {
    markTask(lesson.id, task.id, "hinted");
    setShowHint(true);setHintLevel(n=>n+1);
    loadMark();
    ping();
  }

  function onGiveUp() {
    markTask(lesson.id, task.id, "gave_up");
    setShowDebrief(true);
    loadMark();
    ping();
  }

  return (
    <div className="shell lesson-shell">
      <p><button className="ghost" onClick={onMaterials}>← Лекции темы</button></p>
      <div className="split">
      <section className="material-pane">
      <div className="pane-h material-heading"><strong><i aria-hidden="true">◈</i> Задания по теме</strong> <span>Python / {idx + 1} из {keys.length}</span></div>
      <div className="pane-content">
      <p className="mute" style={{ letterSpacing: "0.14em", fontSize: 11 }}>
        {lesson.module} · {lesson.minutes} мин
        {lesson.needsPandas ? " · pandas" : ""}
      </p>
      <p className="practice-topic">{lesson.title}</p>
      {lesson.notebook && <p><a href={lesson.notebook} download>↓ Notebook проекта</a> · <a href="/curriculum/requirements-projects.txt" download>Зависимости</a></p>}
      <div>
      <div className="tasks">
        {lesson.tasks.map((t, i) => (
          <button
            key={t.id}
            title={t.title}
            aria-label={`Задание ${i+1}: ${t.title}`}
            aria-pressed={i===idx}
            className={i === idx ? "active" : "ghost"}
            disabled={busy}
            onClick={() => setIdx(i)}
          >
            {i + 1}{i === lesson.tasks.length - 1 ? " · Итог" : ""}
          </button>
        ))}
      </div>
        <div className="task-content">
          <div className="pane-h">
            <span>{idx === lesson.tasks.length - 1 ? "Итоговое задание" : "Практика"}</span>
            <span className="dim">{mark === "solved" || mark === "solved_hinted" ? "Решено" : mark === "gave_up" ? "Разбор открыт · не засчитано" : "Предстоит решить"}</span>
          </div>
          <div className="task-zones">
            <h1>{task.title}</h1>
            <section className="task-zone task-condition"><h2><span>01</span> Что нужно сделать</h2><Markdown text={task.prompt}/></section>
            <div className="task-io"><section className="task-zone"><h2>На входе</h2><p>{task.input}</p></section><section className="task-zone"><h2>Ожидаемый результат</h2><p>{task.output}</p></section></div>
            {!!task.cases?.length && <section className="task-zone task-samples"><h2><span>02</span> Примеры</h2><ol className="sample-list">{task.cases.map((c,i)=><li key={i}><h3>Пример {i+1}</h3>{c.text?<Markdown text={c.text}/>:<div className="sample-pair"><div><h4>Вход / вызов</h4><pre>{c.input?.replaceAll('`','')}</pre></div><div><h4>Результат</h4><pre>{c.output?.replaceAll('`','')}</pre></div></div>}</li>)}</ol></section>}
            {showHint ? <div className="hint-box task-zone"><h2>Подсказка {hintLevel}</h2><Markdown text={(task.hints ?? [task.hint]).slice(0,Math.max(1,hintLevel)).join("\n\n")}/></div> : null}
            {showDebrief ? (
              <div className="debrief"><h3>Разбор</h3><Markdown text={task.debrief}/>{task.solution && <details><summary>Эталонное решение</summary><Markdown text={"```python\n"+task.solution+"\n```"}/></details>}</div>
            ) : null}
            <div className="row" style={{ borderTop: 0, padding: "12px 0 0" }}>
              <button
                className="ghost"
                onClick={onHint}
                disabled={hintLevel >= (task.hints?.length ?? 1) || mark === "solved"}
              >
                {showHint ? "Ещё подсказка" : "Подсказка"}
              </button>
              <button className="ghost" onClick={onGiveUp}>
                Открыть разбор
              </button>
            </div>
          </div>
        </div>
      </div><div className="stage-next">{idx<lesson.tasks.length-1?<button disabled={mark!=="solved"&&mark!=="solved_hinted"} onClick={()=>setIdx(idx+1)}>Следующее задание →</button>:<button disabled={!lesson.tasks.every(t=>['solved','solved_hinted'].includes(getProgress().tasks[taskKey(lesson.id,t.id)]))} onClick={onLeetcode}>Далее: LeetCode →</button>}</div></div></section>
        <section className={`pane editor-pane ${busy ? "running" : ""}`} aria-label="Редактор Python">
          {runCycle > 0 && <div key={`wave-${runCycle}`} className="run-wave" aria-hidden="true"/>}
          <div className="pane-h">
            <label htmlFor="python-editor">practice.py</label>
            <span className="runtime-state"><i className="runtime-dot" />{busy ? "Выполняется" : ready ? "Python готов" : "Загрузка Python"}</span>
          </div>
          <div className="editor-wrap">
          <div ref={gutterRef} className="editor-gutter" aria-hidden="true">{code.split("\n").map((_,i)=><span className={result?.diagnostic?.line===i+1?"gutter-error":""} key={i}>{i+1}</span>)}</div>
          <div className="editor-stack">
          {result?.diagnostic?.line&&<div className="error-editor-line" aria-hidden="true" style={{top:22+(result.diagnostic.line-1)*lineHeight-editorScroll,height:lineHeight}}/>}
          <div className="active-editor-line" aria-hidden="true" style={{top:activeTop}}/>
          <pre ref={highlightRef} className="editor-highlight" aria-hidden="true"><code dangerouslySetInnerHTML={{ __html: highlightPython(code) + (code.endsWith("\n") ? "\n" : "") }} /></pre>
          <textarea
            ref={editorRef}
            id="python-editor"
            aria-describedby="editor-help"
            disabled={busy}
            onSelect={e=>updateLine(e.currentTarget)}
            onScroll={e => { updateLine(e.currentTarget); if (highlightRef.current) { highlightRef.current.scrollTop = e.currentTarget.scrollTop; highlightRef.current.scrollLeft = e.currentTarget.scrollLeft; } if (gutterRef.current) gutterRef.current.scrollTop = e.currentTarget.scrollTop; }}
            className="editor"
            value={code}
            spellCheck={false}
            onKeyDown={(e) => {
              if(suggestions.length){
                if(e.key==='Escape'){e.preventDefault();setSuggestions([]);return;}
                if(e.key==='ArrowDown'||e.key==='ArrowUp'){e.preventDefault();setSuggested(i=>(i+(e.key==='ArrowDown'?1:suggestions.length-1))%suggestions.length);return;}
                if(e.key==='Enter'||(e.key==='Tab'&&!e.shiftKey)){e.preventDefault();acceptVariable(suggestions[suggested]??suggestions[0]);return;}
              }
              if (e.key === "Escape") document.getElementById("lesson-check")?.focus();
              if (e.key === "Tab" && !e.shiftKey) {
                e.preventDefault();
                const el = e.currentTarget;
                const s = el.selectionStart;
                const t = el.selectionEnd;
                const next = code.slice(0, s) + "    " + code.slice(t);
                setCode(next);setResult(null);localStorage.setItem(profileKey(`z2p-code:${lesson.id}:${task.id}`),next);
                requestAnimationFrame(() => {
                  el.selectionStart = el.selectionEnd = s + 4;
                });
              }
            }}
            onChange={(e) => { localStorage.setItem(profileKey(`z2p-code:${lesson.id}:${task.id}`),e.target.value); setCode(e.target.value);setResult(null);setSuggestions(variableSuggestions(e.target.value,e.target.selectionStart));setSuggested(0); updateLine(e.currentTarget); }}
          />
          {!!suggestions.length&&<div className="variable-menu" role="listbox" aria-label="Переменные в вашем коде" style={{top:Math.max(0,Math.min(activeTop+lineHeight,300))}}>{suggestions.map((name,i)=><button role="option" aria-selected={i===suggested} key={name} onMouseDown={e=>e.preventDefault()} onClick={()=>acceptVariable(name)}><span>𝑥</span>{name}<small>переменная</small></button>)}</div>}
          </div></div>
          <p id="editor-help" className="editor-help dim">Tab — отступ или принять переменную · Esc — закрыть подсказку · Shift+Tab — выйти</p>
          <div className="pane-h result-heading"><span><i aria-hidden="true">↳</i> Результат</span><span className="result-caption">{busy ? "Выполняется…" : result ? result.ok ? "✓ Успешно" : "● Ошибка" : "Готов к запуску"}</span></div>
          <div className="execution-results" key={`result-${runNumber}`}>
            {result ? <><div role="status" className={`run-summary ${result.ok?'success':'failure'}`}><b>{result.ok?'✓':'!'}</b><div><strong>{result.ok ? runKind==='tests'?'Все проверки пройдены':'Код выполнен' : result.diagnostic?.name==='AssertionError'?'Решение пока не прошло проверку':result.diagnostic?.name??'Ошибка выполнения'}</strong><p>{result.ok ? runKind==='tests'?'Задание засчитано. Можно перейти к следующему.':'Запуск проверяет выполнение программы. Для зачёта нажмите «Проверить решение».' : explainPythonError(result.diagnostic?.name??'')}</p>{result.diagnostic?.line&&<button className="error-location" onClick={focusError}>Перейти к строке {result.diagnostic.line} ↗</button>}{result.diagnostic?.message&&<code className="error-message">{result.diagnostic.message}</code>}</div></div>
            <div className="stdout-zone"><h3>Вывод программы</h3><pre>{result.stdout||'Программа ничего не напечатала.'}</pre></div>
            {result.error&&<details className="traceback-zone"><summary>Полный текст ошибки Python</summary><pre>{result.error}</pre></details>}</> : <p className={`runtime-log ${bootError?"runtime-failure":""}`} role="status">{busy?'Выполняется…':log==='idle.'?'Python готов. Напишите решение и запустите проверку.':log}</p>}
            {images.map((src,i)=><img key={i} src={src} alt={`График Python ${i+1}`} className="python-plot"/>)}
          </div>
          {result?.trace && <TracePlayer key={runNumber} code={code} steps={result.trace} truncated={result.traceTruncated}/>}
          <div className="row actions-bar">
            <button id="lesson-check" disabled={!ready || busy} onClick={() => onRun("tests")}>
              Проверить решение
            </button>
            <button
              className="ghost"
              disabled={!ready || busy}
              onClick={() => onRun("open")}
            >
              ▷ Запустить код
            </button>
          </div>
        </section>
      </div>
    </div>
  );
}
