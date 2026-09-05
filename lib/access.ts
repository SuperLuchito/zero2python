import { lessonById, modules } from "../content/curriculum";
import { lessonStatus, type Progress } from "./progress";

export const orderedLessons = modules
  .flatMap((m) => m.lessonIds)
  .map((id) => lessonById[id]);
export const lessonDone = (id: string, p: Progress) => {
  const lesson = lessonById[id];
  return (
    !!lesson &&
    lessonStatus(
      id,
      lesson.tasks.map((t) => t.id),
      p.tasks,
    ) === "done"
  );
};
export function blockingLesson(id: string, p: Progress) {
  // Earlier saved completions stay available for revision even if there are gaps.
  if (lessonDone(id, p)) return undefined;
  const index = orderedLessons.findIndex((l) => l.id === id);
  return orderedLessons.slice(0, index).find((l) => !lessonDone(l.id, p));
}
export function universityAccess(
  p: Progress,
  prerequisites: string[] | null,
  materialsReady: boolean,
) {
  if (prerequisites === null)
    return { state: "requirements-pending" as const, missing: [] };
  const missing = prerequisites.filter((id) => !lessonDone(id, p));
  return {
    state: missing.length
      ? ("prerequisites-missing" as const)
      : materialsReady
        ? ("available" as const)
        : ("materials-pending" as const),
    missing,
  };
}
