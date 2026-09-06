"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { highlightPython } from "@/lib/highlight";
import type { Lesson, TaskMark } from "@/lib/types";
import { getProgress, markTask, taskKey } from "@/lib/storage";
import { bootPython, runOpen, runTests } from "@/lib/pyodide";

function ping() {
  window.dispatchEvent(new Event("py-term-progress"));
}

export function LessonView({ lesson }: { lesson: Lesson }) {
  const [idx, setIdx] = useState(0);
  const [stage, setStage] = useState<"theory" | "practice">("theory");
  const task = lesson.tasks[idx];
  const [code, setCode] = useState(task.starter);
  const [log, setLog] = useState("idle.");
  const [busy, setBusy] = useState(false);
  const [ready, setReady] = useState(false);
  const [showHint, setShowHint] = useState(false);
  const [showDebrief, setShowDebrief] = useState(false);
  const [mark, setMark] = useState<TaskMark>("untouched");
  const [tele, setTele] = useState("");
  const highlightRef = useRef<HTMLPreElement>(null);
  const gutterRef = useRef<HTMLDivElement>(null);
  const [runNumber, setRunNumber] = useState(0);

  const keys = useMemo(
    () => lesson.tasks.map((t) => taskKey(lesson.id, t.id)),
    [lesson],
  );

  const loadMark = useCallback(() => {
    const p = getProgress();
    setMark(p.tasks[taskKey(lesson.id, task.id)] ?? "untouched");
  }, [lesson.id, task.id]);

  useEffect(() => {
    setCode(task.starter);
    setLog("idle.");
    setTele("");
    const p = getProgress();
    const m = p.tasks[taskKey(lesson.id, task.id)] ?? "untouched";
    setMark(m);
    setShowHint(m === "hinted" || m === "solved_hinted");
    setShowDebrief(m === "solved" || m === "solved_hinted" || m === "gave_up");
  }, [task, loadMark]);

  useEffect(() => {
    let live = true;
    (async () => {
      try {
        await bootPython(lesson.needsPandas, (s) => {
          if (live) setLog((prev) => (prev === "idle." ? s : prev + "\n" + s));
        });
        if (live) setReady(true);
      } catch (e) {
        if (live)
          setLog("fail: " + (e instanceof Error ? e.message : String(e)));
      }
    })();
    return () => {
      live = false;
    };
  }, [lesson.needsPandas]);

  async function onRun(kind: "tests" | "open") {
    if (!ready || busy) return;
    setBusy(true);
    setTele("");
    setLog("Выполняется…");
    try {
      const res =
        kind === "tests"
          ? await runTests(code, task.tests)
          : await runOpen(code);
      const body = [
        res.ok ? "status: ok" : "status: fail",
        res.stdout ? "stdout:\n" + res.stdout : "stdout: (пусто)",
        res.error ? "traceback:\n" + res.error : "",
      ]
        .filter(Boolean)
        .join("\n");
      setTele(body);
      setRunNumber(n => n + 1);
      setLog(body);
      if (kind === "tests" && res.ok) {
        const next = markTask(lesson.id, task.id, "solved");
        setMark(next.tasks[taskKey(lesson.id, task.id)]);
        setShowDebrief(true);
        ping();
      }
    } catch (e) {
      setLog("fail: " + (e instanceof Error ? e.message : String(e)));
    } finally {
      setBusy(false);
    }
  }

  function onHint() {
    markTask(lesson.id, task.id, "hinted");
    setShowHint(true);
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
      <p><Link href={`/app/module/${lesson.module}`}>← Темы модуля</Link></p>
      <div className="split">
      <section className="material-pane">
      <div className="pane-h material-heading"><strong><i aria-hidden="true">◈</i> Теория и практика</strong> <span>Python / {idx + 1} из {keys.length}</span></div>
      <div className="pane-content">
      <p className="mute" style={{ letterSpacing: "0.14em", fontSize: 11 }}>
        {lesson.module} · {lesson.minutes} мин
        {lesson.needsPandas ? " · pandas" : ""}
      </p>
      <h1>{lesson.title}</h1>
      <div className="lesson-stages"><button className={stage === "theory" ? "selected" : ""} aria-pressed={stage === "theory"} onClick={() => setStage("theory")}>01 Теория</button><button className={stage === "practice" ? "selected" : ""} aria-pressed={stage === "practice"} onClick={() => setStage("practice")}>02 Практика</button></div>
      <div className="prose" hidden={stage !== "theory"}>
        {lesson.body.map((p) => (
          <p key={p}>{p}</p>
        ))}
      </div>
      {stage === "theory" && <button className="theory-next" onClick={() => setStage("practice")}>Перейти к заданиям →</button>}
      <div hidden={stage !== "practice"}>
      <div className="tasks">
        {lesson.tasks.map((t, i) => (
          <button
            key={t.id}
            className={i === idx ? "active" : "ghost"}
            disabled={busy}
            onClick={() => setIdx(i)}
          >
            {i + 1}. {t.title}
          </button>
        ))}
      </div>
        <div className="task-content">
          <div className="pane-h">
            <span>Практика</span>
            <span className="dim">{mark === "solved" || mark === "solved_hinted" ? "Решено" : "Предстоит решить"}</span>
          </div>
          <div style={{ padding: 12, flex: 1 }}>
            <p>{task.prompt}</p>
            <div className="examples">
              Примеры:
              {task.examples.map((e) => (
                <div key={e}>
                  <code dangerouslySetInnerHTML={{ __html: highlightPython(e) }} />
                </div>
              ))}

            </div>
            {showHint ? <div className="hint-box">{task.hint}</div> : null}
            {showDebrief ? (
              <div className="debrief">{task.debrief}</div>
            ) : null}
            <div className="row" style={{ borderTop: 0, padding: "12px 0 0" }}>
              <button
                className="ghost"
                onClick={onHint}
                disabled={showHint || mark === "solved"}
              >
                подсказка
              </button>
              <button className="ghost" onClick={onGiveUp}>
                сдаться
              </button>
            </div>
          </div>
        </div>
      </div></div></section>
        <section className={`pane editor-pane ${busy ? "running" : ""}`} aria-label="Редактор Python">
          <div className="pane-h">
            <label htmlFor="python-editor">practice.py</label>
            <span className="runtime-state"><i className="runtime-dot" />{busy ? "Выполняется" : ready ? "Python готов" : "Загрузка Python"}</span>
          </div>
          <div className="editor-wrap">
          <div ref={gutterRef} className="editor-gutter" aria-hidden="true">{code.split("\n").map((_, i) => i + 1).join("\n")}</div>
          <div className="editor-stack">
          <pre ref={highlightRef} className="editor-highlight" aria-hidden="true"><code dangerouslySetInnerHTML={{ __html: highlightPython(code) + (code.endsWith("\n") ? "\n" : "") }} /></pre>
          <textarea
            id="python-editor"
            aria-describedby="editor-help"
            disabled={busy}
            onScroll={e => { if (highlightRef.current) { highlightRef.current.scrollTop = e.currentTarget.scrollTop; highlightRef.current.scrollLeft = e.currentTarget.scrollLeft; } if (gutterRef.current) gutterRef.current.scrollTop = e.currentTarget.scrollTop; }}
            className="editor"
            value={code}
            spellCheck={false}
            onKeyDown={(e) => {
              if (e.key === "Escape") document.getElementById("lesson-check")?.focus();
              if (e.key === "Tab" && !e.shiftKey) {
                e.preventDefault();
                const el = e.currentTarget;
                const s = el.selectionStart;
                const t = el.selectionEnd;
                const next = code.slice(0, s) + "    " + code.slice(t);
                setCode(next);
                requestAnimationFrame(() => {
                  el.selectionStart = el.selectionEnd = s + 4;
                });
              }
            }}
            onChange={(e) => setCode(e.target.value)}
          />
          </div></div>
          <p id="editor-help" className="editor-help dim">Tab — отступ · Shift+Tab или Esc — выйти из редактора</p>
          <div className="pane-h result-heading"><span><i aria-hidden="true">↳</i> Результат</span><span className="result-caption">Ваша идея в действии</span></div>
          <pre key={runNumber} className="out" role="status">{tele || log}</pre>
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
