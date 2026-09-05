"use client";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import type { Lesson } from "@/lib/types";
import { markTask, taskKey } from "@/lib/storage";
import { isSolved } from "@/lib/progress";
import { blockingLesson, lessonDone, orderedLessons } from "@/lib/access";
import { bootPython, runOpen, runTests } from "@/lib/pyodide";
import { useProgress } from "./ProgressProvider";

const PY_KEYWORDS =
  "False|None|True|and|as|assert|async|await|break|case|class|continue|def|del|elif|else|except|finally|for|from|global|if|import|in|is|lambda|match|nonlocal|not|or|pass|raise|return|try|while|with|yield";

function esc(s: string) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function highlightParams(inner: string) {
  const re =
    /("[^"\n]*"|'[^'\n]*'|\d[\w.]*)|([A-Za-z_]\w*)|([+\-*/%=<>!&|^~@:]+)|(.)/g;
  let out = "";
  for (const m of inner.matchAll(re)) {
    const [full, lit, name, op] = m;
    if (lit) out += `<span class="tok-str">${esc(lit)}</span>`;
    else if (name) out += `<span class="tok-param">${esc(name)}</span>`;
    else if (op) out += `<span class="tok-op">${esc(op)}</span>`;
    else out += esc(full);
  }
  return out;
}

// ponytail: regex highlighter, not a parser; nested f-strings/triple-quotes edge cases may mistint
export function highlightPython(code: string) {
  const re = new RegExp(
    [
      "(#[^\\n]*)",
      '("""[\\s\\S]*?"""|\'\'\'[\\s\\S]*?\'\'\'|"(?:\\\\.|[^"\\\\\\n])*"|\'(?:\\\\.|[^\'\\\\\\n])*\')',
      `\\b(def)(\\s+)([A-Za-z_]\\w*)(\\s*)(\\()([^()\\n]*)(\\))`,
      `\\b(${PY_KEYWORDS})\\b`,
      "\\b(\\d[\\w.]*)\\b",
      "([A-Za-z_]\\w*)(?=\\s*\\()",
      "([+\\-*/%=<>!&|^~@]+)",
      "([()\\[\\]{},.:;])",
    ].join("|"),
    "g",
  );
  let out = "";
  let last = 0;
  for (const m of code.matchAll(re)) {
    out += esc(code.slice(last, m.index));
    last = m.index + m[0].length;
    const [full, com, str, d, ds, name, ps, lp, params, rp, kw, num, fn, op] =
      m;
    if (com) out += `<span class="tok-com">${esc(com)}</span>`;
    else if (str) out += `<span class="tok-str">${esc(str)}</span>`;
    else if (d)
      out += `<span class="tok-kw">def</span>${esc(ds)}<span class="tok-fn">${esc(name)}</span>${esc(ps)}<span class="tok-punct">(</span>${highlightParams(params)}<span class="tok-punct">)</span>`;
    else if (kw) out += `<span class="tok-kw">${esc(kw)}</span>`;
    else if (num) out += `<span class="tok-str">${esc(num)}</span>`;
    else if (fn) out += `<span class="tok-fn">${esc(fn)}</span>`;
    else if (op) out += `<span class="tok-op">${esc(op)}</span>`;
    else out += `<span class="tok-punct">${esc(full)}</span>`;
  }
  return out + esc(code.slice(last));
}

export function LessonView({ lesson }: { lesson: Lesson }) {
  const { progress, ready } = useProgress();
  if (!ready)
    return (
      <div className="shell" role="status">
        Проверяем доступ к уроку…
      </div>
    );
  const blocker = blockingLesson(lesson.id, progress);
  if (blocker)
    return (
      <div className="shell">
        <p className="eyebrow">Python / урок закрыт</p>
        <h1>{lesson.title}</h1>
        <section className="frame empty-state">
          <h2>Сначала пройдите предыдущий урок</h2>
          <p>
            Решите все задания урока «{blocker.title}». Подсказки допустимы,
            «Сдаться» не засчитывается.
          </p>
          <Link className="action-link" href={`/app/lesson/${blocker.id}`}>
            К уроку «{blocker.title}» →
          </Link>
        </section>
        <p>
          <Link href="/app">← Карта обучения</Link>
        </p>
      </div>
    );
  return <LessonWorkspace key={lesson.id} lesson={lesson} />;
}
function LessonWorkspace({ lesson }: { lesson: Lesson }) {
  const { progress } = useProgress();
  const [idx, setIdx] = useState(0),
    task = lesson.tasks[idx];
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const code = drafts[task.id] ?? task.starter;
  const [log, setLog] = useState("Загрузка Python…");
  const [tele, setTele] = useState("");
  const [busy, setBusy] = useState(false),
    [ready, setReady] = useState(false);
  const [bootAttempt, setBootAttempt] = useState(0),
    [bootError, setBootError] = useState(false);
  const taRef = useRef<HTMLTextAreaElement>(null);
  const hlRef = useRef<HTMLPreElement>(null);
  const gutRef = useRef<HTMLDivElement>(null);
  const outRef = useRef<HTMLPreElement>(null);
  const highlighted = useMemo(() => highlightPython(code), [code]);
  const lineCount = useMemo(() => code.split("\n").length, [code]);
  const gutter = useMemo(
    () => Array.from({ length: lineCount }, (_, i) => i + 1).join("\n"),
    [lineCount],
  );
  const mark = progress.tasks[taskKey(lesson.id, task.id)] ?? "untouched";
  const [hintFor, setHintFor] = useState<string | null>(null);
  const showHint =
    hintFor === task.id || mark === "hinted" || mark === "solved_hinted";
  const showDebrief = isSolved(mark) || mark === "gave_up";
  const done = lessonDone(lesson.id, progress);
  const next =
    orderedLessons[orderedLessons.findIndex((l) => l.id === lesson.id) + 1];
  useEffect(() => {
    let live = true;
    setBootError(false);
    bootPython(lesson.needsPandas, (line) => {
      if (live) setLog((prev) => prev + "\n" + line);
    })
      .then(() => {
        if (live) {
          setReady(true);
          setLog("Python готов. Введите решение и запустите проверки.");
        }
      })
      .catch((e) => {
        if (live) {
          setBootError(true);
          setLog(
            "Не удалось загрузить Python. Проверьте сеть. " +
              (e as Error).message,
          );
        }
      });
    return () => {
      live = false;
    };
  }, [lesson.needsPandas, bootAttempt]);
  function syncScroll() {
    const ta = taRef.current;
    if (!ta) return;
    if (hlRef.current) {
      hlRef.current.scrollTop = ta.scrollTop;
      hlRef.current.scrollLeft = ta.scrollLeft;
    }
    if (gutRef.current) gutRef.current.scrollTop = ta.scrollTop;
  }

  function pick(i: number) {
    setIdx(i);
    setTele("");
    setLog("Выбрано задание. Черновик сохранен до ухода из урока.");
  }

  async function typeOut(text: string) {
    setTele("");
    if (
      typeof window !== "undefined" &&
      window.matchMedia?.("(prefers-reduced-motion: reduce)").matches
    ) {
      setTele(text);
      return;
    }
    for (let i = 1; i <= text.length; i++) {
      setTele(text.slice(0, i));
      if (i % 3 === 0) {
        await new Promise((r) => setTimeout(r, 8));
        const el = outRef.current;
        if (el) el.scrollTop = el.scrollHeight;
      }
    }
    if (outRef.current) outRef.current.scrollTop = 0;
  }

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
        res.ok
          ? kind === "tests"
            ? "Все проверки пройдены."
            : "Выполнено. Для зачета задачи запустите проверки."
          : "Ошибка. Исправьте решение и попробуйте снова.",
        res.stdout ? `Вывод:\n${res.stdout}` : "Вывод: (пусто)",
        res.error,
      ]
        .filter(Boolean)
        .join("\n\n");
      await typeOut(body);
      setTele(body);
      setLog(body);
      if (kind === "tests" && res.ok) markTask(lesson.id, task.id, "solved");
    } catch (e) {
      const msg = "Ошибка: " + (e as Error).message;
      setTele(msg);
      setLog(msg);
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="shell lesson-shell">
      <p>
        <Link href="/app">← Карта обучения</Link>
      </p>
      <div className="split">
        <section
          className="frame material-pane"
          aria-label="Материал и задание"
        >
          <div className="pane-content">
            <p className="eyebrow">
              {lesson.module} · {lesson.minutes} мин
              {lesson.needsPandas ? " · pandas" : ""}
            </p>
            <h1>{lesson.title}</h1>
            <div className="prose">
              {lesson.body.map((p) => (
                <p key={p}>{p}</p>
              ))}
            </div>
            <div className="tasks" aria-label="Задания урока">
              {lesson.tasks.map((t, i) => (
                <button
                  key={t.id}
                  className={i === idx ? "active" : "ghost"}
                  aria-pressed={i === idx}
                  disabled={busy}
                  onClick={() => pick(i)}
                >
                  {i + 1}. {t.title}
                  {isSolved(progress.tasks[taskKey(lesson.id, t.id)])
                    ? " ✓"
                    : ""}
                </button>
              ))}
            </div>
            <h2>{task.title}</h2>
            <p className="status">
              {isSolved(mark)
                ? "Решено"
                : mark === "gave_up"
                  ? "Разбор открыт · не засчитано"
                  : "Предстоит решить"}
            </p>
            <p>{task.prompt}</p>
            <div className="examples">
              <h3>Примеры</h3>
              {task.examples.map((e) => (
                <p key={e}>
                  <code>{e}</code>
                </p>
              ))}
            </div>
            {showHint && (
              <aside className="hint-box">
                <h3>Подсказка</h3>
                {task.hint}
              </aside>
            )}
            {showDebrief && (
              <aside className="debrief">
                <h3>Разбор</h3>
                {task.debrief}
                {!isSolved(mark) && (
                  <p>
                    Задание еще не решено. Напишите код и пройдите проверки для
                    зачета.
                  </p>
                )}
              </aside>
            )}
            {done && (
              <div className="debrief" role="status">
                <p>Все задания урока решены.</p>
                {next ? (
                  <Link className="action-link" href={`/app/lesson/${next.id}`}>
                    Следующий урок: {next.title} →
                  </Link>
                ) : (
                  <Link className="action-link" href="/app/progress">
                    Посмотреть результаты →
                  </Link>
                )}
              </div>
            )}
          </div>
        </section>
        <section
          className={`pane editor-pane ${busy ? "running" : ""}`}
          aria-label="Редактор Python"
        >
          <div className="pane-h">
            <label htmlFor="python-editor">editor.py</label>
            <span>{ready ? "Python готов" : "Загрузка"}</span>
          </div>
          <div className="editor-wrap">
            <div ref={gutRef} className="editor-gutter" aria-hidden="true">
              {gutter}
            </div>
            <div className="editor-stack">
              <pre
                ref={hlRef}
                className="editor-highlight"
                aria-hidden="true"
              >
                <code
                  dangerouslySetInnerHTML={{
                    __html:
                      highlighted + (code.endsWith("\n") ? "\n" : ""),
                  }}
                />
              </pre>
              <textarea
                ref={taRef}
                id="python-editor"
                className="editor"
                value={code}
                spellCheck={false}
                autoCapitalize="off"
                autoCorrect="off"
                disabled={busy}
                onScroll={syncScroll}
                onKeyDown={(e) => {
                  if (e.key === "Tab") {
                    e.preventDefault();
                    const el = e.currentTarget;
                    const s = el.selectionStart;
                    const t = el.selectionEnd;
                    const next =
                      code.slice(0, s) + "    " + code.slice(t);
                    setDrafts((prev) => ({ ...prev, [task.id]: next }));
                    requestAnimationFrame(() => {
                      el.selectionStart = el.selectionEnd = s + 4;
                    });
                  } else if (e.key === "Escape") {
                    document.getElementById("lesson-check")?.focus();
                  }
                }}
                onChange={(e) =>
                  setDrafts((prev) => ({
                    ...prev,
                    [task.id]: e.target.value,
                  }))
                }
                aria-describedby="editor-help"
              />
            </div>
          </div>
          <p id="editor-help" className="editor-help dim">
            Tab — 4 пробела · Esc — к кнопкам.
          </p>
          <div className="pane-h">Вывод и ошибки</div>
          <pre ref={outRef} className="out" role="status" aria-live="polite">
            {tele || log}
            {busy ? <span className="cursor" /> : null}
          </pre>
          <div className="row actions-bar">
            <button
              id="lesson-check"
              disabled={!ready || busy}
              onClick={() => onRun("tests")}
            >
              Проверить решение
            </button>
            <button
              className="ghost"
              disabled={!ready || busy}
              onClick={() => onRun("open")}
            >
              Запустить код
            </button>
            <button
              className="ghost"
              disabled={showHint || busy}
              onClick={() => {
                setHintFor(task.id);
                markTask(lesson.id, task.id, "hinted");
              }}
            >
              Подсказка
            </button>
            <button
              className="ghost"
              disabled={busy || showDebrief}
              onClick={() => markTask(lesson.id, task.id, "gave_up")}
            >
              Решение
            </button>
            <button
              className="ghost"
              aria-label="Предыдущее задание"
              disabled={busy || idx === 0}
              onClick={() => pick(idx - 1)}
            >
              ←
            </button>
            <button
              className="ghost"
              aria-label="Следующее задание"
              disabled={busy || idx === lesson.tasks.length - 1}
              onClick={() => pick(idx + 1)}
            >
              →
            </button>
            {bootError && (
              <button onClick={() => setBootAttempt((n) => n + 1)}>
                Повторить загрузку
              </button>
            )}
            {done &&
              (next ? (
                <Link
                  className="action-link"
                  href={`/app/lesson/${next.id}`}
                >
                  Следующий: {next.title} →
                </Link>
              ) : (
                <Link className="action-link" href="/app/progress">
                  Результаты →
                </Link>
              ))}
          </div>
        </section>
      </div>
    </div>
  );
}
