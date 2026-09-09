import {profileKey,queueProgress} from './account';
import type { TaskMark } from "./types";

const KEY = "py-term.v1";

export type Progress = {
  tasks: Record<string, TaskMark>;
  qotd: Record<string, { qid: string; ok: boolean }>;
};

const empty = (): Progress => ({ tasks: {}, qotd: {} });

function read(): Progress {
  if (typeof window === "undefined") return empty();
  try {
    const raw = localStorage.getItem(profileKey(KEY));
    if (!raw) return empty();
    const parsed = JSON.parse(raw) as Progress;
    return {
      tasks: parsed.tasks ?? {},
      qotd: parsed.qotd ?? {},
    };
  } catch {
    return empty();
  }
}

function write(p: Progress) {
  localStorage.setItem(profileKey(KEY), JSON.stringify(p));
}

export function taskKey(lessonId: string, taskId: string) {
  return `${lessonId}::${taskId}`;
}

export function getProgress(): Progress {
  return read();
}

export function markTask(lessonId: string, taskId: string, mark: TaskMark) {
  const p = read();
  const k = taskKey(lessonId, taskId);
  const prev = p.tasks[k] ?? "untouched";
  p.tasks[k] = combine(prev, mark);
  write(p);
  queueProgress({kind:'tasks',key:k,value:p.tasks[k]});
  return p;
}

function combine(prev: TaskMark, next: TaskMark): TaskMark {
  if (next === "hinted") {
    if (prev === "solved") return "solved_hinted";
    if (prev === "solved_hinted") return prev;
    return "hinted";
  }
  if (next === "solved") {
    if (prev === "hinted" || prev === "solved_hinted") return "solved_hinted";
    return "solved";
  }
  if (next === "gave_up") {
    if (prev === "solved" || prev === "solved_hinted") return prev;
    return "gave_up";
  }
  return next;
}

export function markQotd(day: string, qid: string, ok: boolean) {
  const p = read();
  if (!p.qotd[day]) p.qotd[day] = { qid, ok };
  write(p);
  queueProgress({kind:'qotd',key:day,value:p.qotd[day]});
  return p;
}

export function lessonStatus(
  lessonId: string,
  taskIds: string[],
  tasks: Record<string, TaskMark>,
): "empty" | "hinted" | "partial" | "done" {
  const marks = taskIds.map((id) => tasks[taskKey(lessonId, id)] ?? "untouched");
  if (marks.every((m) => m === "untouched")) return "empty";
  if (marks.every((m) => m === "solved" || m === "solved_hinted")) return "done";
  if (marks.some((m) => m === "hinted" || m === "solved_hinted")) return "hinted";
  return "partial";
}

export function counts(tasks: Record<string, TaskMark>, allKeys: string[]) {
  let done = 0;
  let hinted = 0;
  for (const k of allKeys) {
    const m = tasks[k];
    if (m === "solved" || m === "solved_hinted") done += 1;
    if (m === "hinted" || m === "solved_hinted") hinted += 1;
  }
  return { done, hinted, total: allKeys.length };
}
