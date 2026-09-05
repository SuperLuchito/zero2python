"use client";
import Link from "next/link";
import { lessonById } from "@/content/curriculum";
import {
  universityMaterialsReady,
  universityPrerequisites,
} from "@/content/university";
import { lessonDone, orderedLessons, universityAccess } from "@/lib/access";
import { useProgress } from "./ProgressProvider";
import { CourseSwitch } from "./CourseSwitch";
export function UniversityView() {
  const { progress, ready } = useProgress();
  const access = universityAccess(
    progress,
    universityPrerequisites,
    universityMaterialsReady,
  );
  const next = orderedLessons.find((l) => !lessonDone(l.id, progress));
  return (
    <div className="shell">
      <p className="eyebrow">zero2python / анализ данных</p>
      <h1>Университетский курс</h1>
      <CourseSwitch university />
      <p className="prose dim">
        Практика по материалам университета откроется после необходимых тем
        Python и добавления программы курса.
      </p>
      {!ready ? (
        <p role="status">Загружаем прогресс…</p>
      ) : (
        <section className="frame empty-state">
          <h2>
            {access.state === "available"
              ? "Курс доступен"
              : access.state === "prerequisites-missing"
                ? "Сначала подготовка Python"
                : "Материалы готовятся"}
          </h2>
          <div className="requirements">
            <div>
              <h3>01 / Учебная база</h3>
              <p>
                {access.state === "requirements-pending"
                  ? "Точные предпосылки пока не определены: сначала нужна программа университета."
                  : access.missing.length
                    ? "Пройдите оставшиеся темы Python."
                    : "Все необходимые темы Python пройдены."}
              </p>
              {universityPrerequisites?.map((id) => (
                <p key={id}>
                  <Link href={`/app/lesson/${id}`}>
                    {lessonById[id]?.title || id}
                  </Link>{" "}
                  — {lessonDone(id, progress) ? "пройдено" : "предстоит пройти"}
                </p>
              ))}
            </div>
            <div>
              <h3>02 / Учебные материалы</h3>
              <p>
                {universityMaterialsReady
                  ? "Материалы подключены."
                  : "Программа, задания и данные еще не получены. Завершение Python само по себе не открывает отсутствующие задания."}
              </p>
            </div>
          </div>
          {next ? (
            <Link className="action-link" href={`/app/lesson/${next.id}`}>
              Продолжить Python: {next.title} →
            </Link>
          ) : (
            <Link className="action-link" href="/app">
              Повторить уроки Python →
            </Link>
          )}
        </section>
      )}
    </div>
  );
}
