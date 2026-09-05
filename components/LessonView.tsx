"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import type { Lesson } from "@/lib/types";
import { markTask, taskKey } from "@/lib/storage";
import { isSolved } from "@/lib/progress";
import { blockingLesson, lessonDone, orderedLessons } from "@/lib/access";
import { bootPython, runOpen, runTests } from "@/lib/pyodide";
import { useProgress } from "./ProgressProvider";

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
  const [busy, setBusy] = useState(false),
    [ready, setReady] = useState(false);
  const [bootAttempt, setBootAttempt] = useState(0),
    [bootError, setBootError] = useState(false);
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
  async function onRun(kind: "tests" | "open") {
    if (!ready || busy) return;
    setBusy(true);
    setLog("Выполняется…");
    try {
      const res =
        kind === "tests"
          ? await runTests(code, task.tests)
          : await runOpen(code);
      setLog(
        [
          res.ok
            ? kind === "tests"
              ? "Все проверки пройдены."
              : "Выполнено. Для зачета задачи запустите проверки."
            : "Ошибка. Исправьте решение и попробуйте снова.",
          res.stdout ? `Вывод:\n${res.stdout}` : "Вывод: (пусто)",
          res.error,
        ]
          .filter(Boolean)
          .join("\n\n"),
      );
      if (kind === "tests" && res.ok) markTask(lesson.id, task.id, "solved");
    } catch (e) {
      setLog("Ошибка: " + (e as Error).message);
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
                  onClick={() => {
                    setIdx(i);
                    setLog(
                      "Выбрано задание. Черновик сохранен до ухода из урока.",
                    );
                  }}
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
            <div className="row actions-inline">
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
                Сдаться
              </button>
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
          className={`frame pane editor-pane ${busy ? "running" : ""}`}
          aria-label="Редактор Python"
        >
          <div className="pane-h">
            <label htmlFor="python-editor">editor.py</label>
            <span>{ready ? "Python готов" : "Загрузка"}</span>
          </div>
          <textarea
            id="python-editor"
            className="editor"
            value={code}
            spellCheck={false}
            autoCapitalize="off"
            autoCorrect="off"
            disabled={busy}
            onChange={(e) =>
              setDrafts((prev) => ({ ...prev, [task.id]: e.target.value }))
            }
            aria-describedby="editor-help"
          />
          <p id="editor-help" className="editor-help dim">
            Отступ — 4 пробела. Tab переводит фокус к кнопкам.
          </p>
          <div className="row">
            <button disabled={!ready || busy} onClick={() => onRun("tests")}>
              Проверить решение
            </button>
            <button
              className="ghost"
              disabled={!ready || busy}
              onClick={() => onRun("open")}
            >
              Запустить код
            </button>
            {bootError && (
              <button onClick={() => setBootAttempt((n) => n + 1)}>
                Повторить загрузку
              </button>
            )}
          </div>
          <div className="pane-h">Вывод и ошибки</div>
          <pre className="out" role="status" aria-live="polite">
            {log}
          </pre>
        </section>
      </div>
    </div>
  );
}
