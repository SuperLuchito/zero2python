"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { Lesson, TaskMark } from "@/lib/types";
import { getProgress, markTask, taskKey } from "@/lib/storage";
import { bootPython, runOpen, runTests } from "@/lib/pyodide";

function ping() {
  window.dispatchEvent(new Event("py-term-progress"));
}

export function LessonView({ lesson }: { lesson: Lesson }) {
  const [idx, setIdx] = useState(0);
  const task = lesson.tasks[idx];
  const [code, setCode] = useState(task.starter);
  const [log, setLog] = useState("idle.");
  const [busy, setBusy] = useState(false);
  const [ready, setReady] = useState(false);
  const [showHint, setShowHint] = useState(false);
  const [showDebrief, setShowDebrief] = useState(false);
  const [mark, setMark] = useState<TaskMark>("untouched");
  const [tele, setTele] = useState("");

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

  async function typeOut(text: string) {
    setTele("");
    for (let i = 1; i <= text.length; i++) {
      setTele(text.slice(0, i));
      if (i % 3 === 0) await new Promise((r) => setTimeout(r, 8));
    }
  }

  async function onRun(kind: "tests" | "open") {
    if (!ready || busy) return;
    setBusy(true);
    setLog("> run");
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
      await typeOut(body);
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
    <div className="shell">
      <p className="mute" style={{ letterSpacing: "0.14em", fontSize: 11 }}>
        {lesson.module} · {lesson.minutes} мин
        {lesson.needsPandas ? " · pandas" : ""}
      </p>
      <h1>{lesson.title}</h1>
      <div className="prose">
        {lesson.body.map((p) => (
          <p key={p}>{p}</p>
        ))}
      </div>
      <div className="tasks">
        {lesson.tasks.map((t, i) => (
          <button
            key={t.id}
            className={i === idx ? "active" : "ghost"}
            onClick={() => setIdx(i)}
          >
            {i + 1}. {t.title}
          </button>
        ))}
      </div>
      <div className="split">
        <div className="frame pane">
          <div className="pane-h">
            <span>бриф</span>
            <span className="dim">{mark}</span>
          </div>
          <div style={{ padding: 12, flex: 1 }}>
            <p>{task.prompt}</p>
            <div className="examples">
              видно:
              {task.examples.map((e) => (
                <div key={e}>
                  <code>{e}</code>
                </div>
              ))}
              скрытые тесты — нет. они просто падают.
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
        <div className={`frame pane ${busy ? "running" : ""}`}>
          <div className="pane-h">
            <span>editor.py</span>
            <span className="dim">{ready ? "pyodide" : "boot"}</span>
          </div>
          <textarea
            className="editor"
            value={code}
            spellCheck={false}
            onKeyDown={(e) => {
              if (e.key === "Tab") {
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
          <div className="row">
            <button disabled={!ready || busy} onClick={() => onRun("tests")}>
              run tests
            </button>
            <button
              className="ghost"
              disabled={!ready || busy}
              onClick={() => onRun("open")}
            >
              run
            </button>
          </div>
          <pre className="out">
            {tele || log}
            {busy ? <span className="cursor" /> : null}
          </pre>
        </div>
      </div>
      <p className="mute" style={{ marginTop: 16, fontSize: 11 }}>
        слоты {keys.length}
      </p>
    </div>
  );
}
