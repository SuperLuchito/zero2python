"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { bookParts, demoParts, quizScore, type BookPart } from "@/content/book";
import {
  emptyProgress,
  normalizeProgress,
  type Progress,
} from "@/lib/progress";
import { markQuiz, markReading } from "@/lib/storage";
import { useProgress } from "./ProgressProvider";
const DEMO_KEY = "py-term.book-demo.v1";
export function BookView({ demo = false }: { demo?: boolean }) {
  const { progress, ready } = useProgress();
  const [sample, setSample] = useState<Progress>(emptyProgress),
    [sampleReady, setSampleReady] = useState(false),
    [error, setError] = useState("");
  const [partIndex, setPartIndex] = useState(0);
  useEffect(() => {
    if (!demo) return;
    try {
      setSample(
        normalizeProgress(JSON.parse(localStorage.getItem(DEMO_KEY) || "{}")),
      );
    } catch {
      setError("Не удалось прочитать проверочный пример.");
    }
    setSampleReady(true);
  }, [demo]);
  const parts = demo ? demoParts : bookParts,
    p = demo ? sample : progress;
  const read = parts.filter((part) => p.book.read[part.id]?.value).length;
  const current = parts.find((part) => !p.book.read[part.id]?.value);
  function saveSample(next: Progress) {
    setSample(next);
    try {
      localStorage.setItem(DEMO_KEY, JSON.stringify(next));
      setError("");
    } catch {
      setError(
        "Не удалось сохранить проверочный пример. Не закрывайте страницу.",
      );
    }
  }
  function reading(id: string, value: boolean) {
    if (!demo) {
      markReading(id, value);
      return;
    }
    const next = normalizeProgress(sample);
    next.book.read[id] = { value, at: Date.now() };
    saveSample(next);
  }
  function complete(id: string, answers: number[]) {
    if (!demo) {
      markQuiz(id, answers);
      return;
    }
    const next = normalizeProgress(sample);
    next.book.tests[id] = { answers, at: Date.now() };
    saveSample(next);
  }
  return (
    <div className="shell">
      <p className="eyebrow">zero2python / нейросети</p>
      <h1>{demo ? "Проверочный пример" : "Грокаем глубокое обучение"}</h1>
      {demo ? (
        <div className="demo-notice">
          <strong>Синтетические данные · не содержание книги</strong>
          <p>
            Здесь можно проверить чтение, тест и сохранение. Эти отметки не
            входят в личную статистику и рейтинг команды.
          </p>
          <Link href="/app/book">← Вернуться к книге</Link>
        </div>
      ) : (
        <p className="prose dim">
          Читайте материал, отмечайте изученное и проверяйте понимание. Чтение и
          результаты тестов сохраняются отдельно.
        </p>
      )}
      {error && (
        <p role="alert" className="fail">
          {error}
        </p>
      )}
      {!(demo ? sampleReady : ready) ? (
        <p role="status">Загружаем прогресс…</p>
      ) : !parts.length ? (
        <section className="frame empty-state">
          <h2>Книга еще не добавлена</h2>
          <p>
            Структура глав и страниц появится после получения редакции книги.
            Пока объем изучения не рассчитывается.
          </p>
          <h3>Тесты появятся после добавления материалов</h3>
          <p>Вопросы и объяснения будут привязаны к проверенному источнику.</p>
          <Link className="action-link" href="/app/book/demo">
            Открыть проверочный пример интерфейса →
          </Link>
        </section>
      ) : (
        <>
          <div className="course-summary">
            <span>
              Прочитано: {read}/{parts.length} частей ·{" "}
              {Math.round((read / parts.length) * 100)}%
            </span>
            <span>
              Тестов пройдено:{" "}
              {parts.filter((part) => p.book.tests[part.id]).length}/
              {parts.filter((part) => part.questions.length).length}
            </span>
          </div>
          <p className="dim">
            {current
              ? `Следующий шаг: прочитать «${current.title}».`
              : "Все части отмечены прочитанными. Проверьте знания или повторите материал."}
          </p>
          <div className="tasks" aria-label="Части книги">
            {parts.map((part, i) => (
              <button
                key={part.id}
                className={i === partIndex ? "active" : "ghost"}
                aria-pressed={i === partIndex}
                onClick={() => setPartIndex(i)}
              >
                {part.title}
                {p.book.read[part.id]?.value ? " ✓" : ""}
              </button>
            ))}
          </div>
          <BookPartView
            key={parts[partIndex].id}
            part={parts[partIndex]}
            progress={p}
            onReading={reading}
            onComplete={complete}
          />
        </>
      )}
    </div>
  );
}
function BookPartView({
  part,
  progress,
  onReading,
  onComplete,
}: {
  part: BookPart;
  progress: Progress;
  onReading: (id: string, value: boolean) => void;
  onComplete: (id: string, answers: number[]) => void;
}) {
  const [testing, setTesting] = useState(false),
    [answers, setAnswers] = useState<number[]>([]);
  const result = progress.book.tests[part.id],
    read = progress.book.read[part.id]?.value ?? false;
  return (
    <section className="frame empty-state">
      <h2>{part.title}</h2>
      <p className="dim">Источник: {part.source}</p>
      <div className="prose">
        {part.paragraphs.map((p) => (
          <p key={p}>{p}</p>
        ))}
      </div>
      <label className="check-label">
        <input
          type="checkbox"
          checked={read}
          onChange={(e) => onReading(part.id, e.target.checked)}
        />{" "}
        Прочитано
      </label>
      <div className="book-test">
        <h3>Проверка понимания</h3>
        {testing ? (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              onComplete(part.id, answers);
              setTesting(false);
            }}
          >
            {part.questions.map((q, i) => (
              <fieldset key={i}>
                <legend>
                  {i + 1}. {q.prompt}
                </legend>
                {q.choices.map((choice, n) => (
                  <label key={n} className="choice">
                    <input
                      type="radio"
                      name={`question-${i}`}
                      value={n}
                      checked={answers[i] === n}
                      required
                      onChange={() =>
                        setAnswers((prev) => {
                          const next = [...prev];
                          next[i] = n;
                          return next;
                        })
                      }
                    />
                    {choice}
                  </label>
                ))}
              </fieldset>
            ))}
            <div className="row actions-inline">
              <button
                type="submit"
                disabled={
                  !part.questions.every((_, i) => Number.isInteger(answers[i]))
                }
              >
                Завершить тест
              </button>
              <button
                type="button"
                className="ghost"
                onClick={() => setTesting(false)}
              >
                Отменить
              </button>
            </div>
          </form>
        ) : (
          <>
            {result ? (
              <div className="debrief" role="status">
                <h3>
                  Результат: {quizScore(part, result.answers)}/
                  {part.questions.length}
                </h3>
                <p>
                  Последняя попытка ·{" "}
                  {new Date(result.at).toLocaleDateString("ru-RU")}
                </p>
                {part.questions.map(
                  (q, i) =>
                    result.answers[i] !== q.answer && (
                      <p key={i}>
                        <strong>Повторить: {part.title}.</strong>{" "}
                        {q.explanation}
                      </p>
                    ),
                )}
                {quizScore(part, result.answers) === part.questions.length && (
                  <p>Все верно. Можно продолжить чтение.</p>
                )}
                <p>Отметка чтения: {read ? "прочитано" : "не прочитано"}.</p>
              </div>
            ) : (
              <p className="dim">Тест еще не пройден.</p>
            )}
            <button
              disabled={!read || !part.questions.length}
              onClick={() => {
                setAnswers([]);
                setTesting(true);
              }}
            >
              {result ? "Пройти еще раз" : "Начать тест"}
            </button>
            {!read && (
              <p className="dim">
                Сначала прочитайте материал и отметьте его изученным.
              </p>
            )}
            {!part.questions.length && <p>Вопросы для этой части готовятся.</p>}
          </>
        )}
      </div>
    </section>
  );
}
