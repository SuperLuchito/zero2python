import type { TaskMark } from "./types";

export type ReadMark = { value: boolean; at: number };
export type QuizResult = { answers: number[]; at: number };
export type Progress = {
  tasks: Record<string, TaskMark>;
  qotd: Record<string, { qid: string; ok: boolean }>;
  book: { read: Record<string, ReadMark>; tests: Record<string, QuizResult> };
};
export const emptyProgress = (): Progress => ({
  tasks: {},
  qotd: {},
  book: { read: {}, tests: {} },
});
export const taskKey = (lesson: string, task: string) => `${lesson}::${task}`;
export const isSolved = (mark?: TaskMark) =>
  mark === "solved" || mark === "solved_hinted";
const marks: TaskMark[] = [
  "untouched",
  "hinted",
  "gave_up",
  "solved",
  "solved_hinted",
];
const record = (v: unknown): Record<string, unknown> =>
  v && typeof v === "object" && !Array.isArray(v)
    ? (v as Record<string, unknown>)
    : {};

// Read v1 without resetting saved tasks. Ignore malformed entries at the storage boundary.
export function normalizeProgress(value: unknown): Progress {
  const source = record(value),
    p = emptyProgress();
  for (const [key, value] of Object.entries(record(source.tasks))) {
    if (marks.includes(value as TaskMark)) p.tasks[key] = value as TaskMark;
  }
  for (const [key, value] of Object.entries(record(source.qotd))) {
    const item = record(value);
    if (typeof item.qid === "string" && typeof item.ok === "boolean")
      p.qotd[key] = { qid: item.qid, ok: item.ok };
  }
  const book = record(source.book);
  for (const [key, value] of Object.entries(record(book.read))) {
    const item = record(value);
    if (
      typeof item.value === "boolean" &&
      typeof item.at === "number" &&
      Number.isFinite(item.at)
    )
      p.book.read[key] = { value: item.value, at: item.at };
  }
  for (const [key, value] of Object.entries(record(book.tests))) {
    const item = record(value);
    if (
      Array.isArray(item.answers) &&
      item.answers.every((n) => Number.isInteger(n) && n >= 0) &&
      typeof item.at === "number" &&
      Number.isFinite(item.at)
    )
      p.book.tests[key] = { answers: item.answers, at: item.at };
  }
  return p;
}

export function combine(prev: TaskMark, next: TaskMark): TaskMark {
  if (isSolved(prev) || isSolved(next))
    return [prev, next].some((m) => m === "hinted" || m === "solved_hinted")
      ? "solved_hinted"
      : "solved";
  if (prev === "gave_up" || next === "gave_up") return "gave_up";
  if (prev === "hinted" || next === "hinted") return "hinted";
  return "untouched";
}

export function mergeProgress(a: Progress, b: Progress): Progress {
  const p = normalizeProgress(a);
  for (const [key, mark] of Object.entries(b.tasks))
    p.tasks[key] = combine(p.tasks[key] ?? "untouched", mark);
  p.qotd = { ...b.qotd, ...p.qotd };
  for (const [key, mark] of Object.entries(b.book.read))
    if (!p.book.read[key] || mark.at > p.book.read[key].at)
      p.book.read[key] = mark;
  for (const [key, result] of Object.entries(b.book.tests))
    if (!p.book.tests[key] || result.at > p.book.tests[key].at)
      p.book.tests[key] = result;
  return p;
}

export function lessonStatus(
  lessonId: string,
  taskIds: string[],
  tasks: Progress["tasks"],
): "empty" | "hinted" | "partial" | "done" {
  const values = taskIds.map(
    (id) => tasks[taskKey(lessonId, id)] ?? "untouched",
  );
  if (!values.length || values.every((m) => m === "untouched")) return "empty";
  if (values.every(isSolved)) return "done";
  if (values.some((m) => m === "hinted" || m === "solved_hinted"))
    return "hinted";
  return "partial";
}
export function counts(tasks: Progress["tasks"], keys: string[]) {
  return {
    done: keys.filter((k) => isSolved(tasks[k])).length,
    hinted: keys.filter(
      (k) => tasks[k] === "hinted" || tasks[k] === "solved_hinted",
    ).length,
    total: keys.length,
  };
}
