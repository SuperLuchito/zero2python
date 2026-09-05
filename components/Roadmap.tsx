"use client";
import Link from "next/link";
import {
  allTaskKeys,
  lessonById,
  lessons,
  modules,
} from "@/content/curriculum";
import { counts, lessonStatus } from "@/lib/progress";
import { blockingLesson, lessonDone, orderedLessons } from "@/lib/access";
import { useProgress } from "./ProgressProvider";
import { CourseSwitch } from "./CourseSwitch";
const LABEL = {
  empty: "Доступен",
  partial: "В работе",
  hinted: "В работе · подсказка",
  done: "Пройден",
};
export function Roadmap() {
  const { progress: p, ready } = useProgress();
  const next = orderedLessons.find((l) => !lessonDone(l.id, p));
  const c = counts(p.tasks, allTaskKeys());
  return (
    <div className="shell">
      <p className="eyebrow">zero2python / учебный маршрут</p>
      <h1>Карта обучения</h1>
      <CourseSwitch />
      <p className="prose dim">
        Решите все задания урока, чтобы открыть следующий. Подсказки допустимы;
        «Сдаться» не засчитывается. Вопрос дня доступен независимо от курса.
      </p>
      {!ready ? (
        <p role="status">Загружаем прогресс…</p>
      ) : (
        <>
          <div className="course-summary">
            <span>
              {c.done}/{c.total} задач ·{" "}
              {orderedLessons.filter((l) => lessonDone(l.id, p)).length}/
              {lessons.length} уроков
            </span>
            {next ? (
              <Link className="action-link" href={`/app/lesson/${next.id}`}>
                Продолжить →
              </Link>
            ) : (
              <span className="ok">Все уроки пройдены. Можно повторять!</span>
            )}
          </div>
          <div className="modules">
            {modules.map((m) => (
              <section key={m.id} className="frame module">
                <header>
                  <h2>{m.title}</h2>
                  <span className="dim">{m.blurb}</span>
                </header>
                {m.lessonIds.map((id) => {
                  const l = lessonById[id],
                    blocker = blockingLesson(id, p),
                    status = lessonStatus(
                      id,
                      l.tasks.map((t) => t.id),
                      p.tasks,
                    );
                  return (
                    <Link
                      key={id}
                      href={`/app/lesson/${id}`}
                      className={`lesson-row ${blocker ? "locked" : ""}`}
                    >
                      <span className="dim">{l.minutes} мин</span>
                      <span>
                        {l.title}
                        {blocker && <small>Сначала: {blocker.title}</small>}
                      </span>
                      <span
                        className={`status ${status === "done" ? "ok" : "dim"}`}
                      >
                        {blocker ? "Закрыт" : LABEL[status]}
                      </span>
                    </Link>
                  );
                })}
              </section>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
