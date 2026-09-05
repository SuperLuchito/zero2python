import {
  combine,
  emptyProgress,
  normalizeProgress,
  mergeProgress,
  taskKey,
  type Progress,
} from "./progress";
import type { TaskMark } from "./types";
export { counts, lessonStatus, taskKey } from "./progress";
export type { Progress } from "./progress";
export const GUEST_KEY = "py-term.v1";
let activeKey = GUEST_KEY;
let current: Progress | null = null;
let storageError = "";
const unreadableKeys = new Set<string>();
export const getStorageError = () => storageError;
export const getActiveKey = () => activeKey;
export function readProgress(key = activeKey): Progress {
  if (typeof window === "undefined") return emptyProgress();
  try {
    const raw = localStorage.getItem(key);
    const result = raw ? normalizeProgress(JSON.parse(raw)) : emptyProgress();
    unreadableKeys.delete(key);
    return result;
  } catch {
    unreadableKeys.add(key);
    storageError =
      "Не удалось прочитать сохранение браузера. Проверьте доступ к хранилищу; исходные данные не удалены.";
    return emptyProgress();
  }
}
export function getProgress(): Progress {
  const saved = readProgress();
  current = current ? mergeProgress(saved, current) : saved;
  return current;
}
export function selectProgress(key: string, p = readProgress(key)) {
  activeKey = key;
  current = p;
  window.dispatchEvent(new Event("py-term-progress"));
}
export function saveProgress(p: Progress, notify = true) {
  current = p;
  try {
    if (unreadableKeys.has(activeKey)) {
      // Keep the original before recovering a corrupt v1 snapshot. If storage is unavailable, this also fails safely.
      const original = localStorage.getItem(activeKey);
      if (original) localStorage.setItem(`${activeKey}.recovery`, original);
      unreadableKeys.delete(activeKey);
    }
    localStorage.setItem(activeKey, JSON.stringify(p));
    storageError = "";
  } catch {
    storageError =
      "Не удалось сохранить прогресс в браузере. Не закрывайте страницу и повторите сохранение.";
  }
  if (notify) window.dispatchEvent(new Event("py-term-progress"));
  return p;
}
export function markTask(lesson: string, task: string, mark: TaskMark) {
  const p = normalizeProgress(getProgress()),
    key = taskKey(lesson, task);
  p.tasks[key] = combine(p.tasks[key] ?? "untouched", mark);
  return saveProgress(p);
}
export function markQotd(day: string, qid: string, ok: boolean) {
  const p = normalizeProgress(getProgress());
  p.qotd[day] ??= { qid, ok };
  return saveProgress(p);
}
export function markReading(id: string, value: boolean) {
  const p = normalizeProgress(getProgress());
  p.book.read[id] = { value, at: Date.now() };
  return saveProgress(p);
}
export function markQuiz(id: string, answers: number[]) {
  const p = normalizeProgress(getProgress());
  p.book.tests[id] = { answers, at: Date.now() };
  return saveProgress(p);
}
