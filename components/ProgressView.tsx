"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { allTaskKeys } from "@/content/curriculum";
import { bookParts, quizScore } from "@/content/book";
import { counts } from "@/lib/progress";
import { lessonDone, orderedLessons } from "@/lib/access";
import type { LeaderboardRow } from "@/lib/leaderboard";
import { api, useProgress } from "./ProgressProvider";
export function ProgressView({
  leaderboard = false,
}: {
  leaderboard?: boolean;
}) {
  const { progress, ready, user, error, syncing, refresh } = useProgress();
  const c = counts(progress.tasks, allTaskKeys());
  const tested = bookParts.filter((part) => progress.book.tests[part.id]);
  return (
    <div className="shell">
      <p className="eyebrow">zero2python / результаты</p>
      <h1>Прогресс команды</h1>
      <nav className="section-switch" aria-label="Статистика">
        <Link
          href="/app/progress"
          aria-current={!leaderboard ? "page" : undefined}
        >
          Мой прогресс
        </Link>
        <Link
          href="/app/progress/leaderboard"
          aria-current={leaderboard ? "page" : undefined}
        >
          Лидерборд
        </Link>
      </nav>
      {!ready ? (
        <p role="status">Загружаем прогресс…</p>
      ) : (
        <>
          <div className="sync-line" role="status">
            {user
              ? `${user.name} · ${syncing ? "Синхронизация…" : error ? "Есть несинхронизированные данные" : "Прогресс синхронизирован"}`
              : "Локальный профиль · результаты хранятся в этом браузере"}
          </div>
          {error && (
            <div className="notice" role="alert">
              {error}{" "}
              <button className="ghost" onClick={() => void refresh()}>
                Повторить синхронизацию
              </button>
            </div>
          )}
          {leaderboard ? (
            <Leaderboard />
          ) : (
            <div className="stats-grid">
              <section className="frame stat">
                <h2>Python</h2>
                <p className="stat-value">
                  {c.done}
                  <span> / {c.total} задач</span>
                </p>
                <p>
                  {
                    orderedLessons.filter((l) => lessonDone(l.id, progress))
                      .length
                  }
                  /{orderedLessons.length} уроков пройдено · {c.hinted} задач с
                  подсказкой
                </p>
                <Link className="action-link" href="/app">
                  Продолжить обучение →
                </Link>
              </section>
              <section className="frame stat">
                <h2>Университетский курс</h2>
                <p>Материалы готовятся</p>
                <p className="dim">
                  Предпосылки уточним по программе. Результатов пока нет.
                </p>
                <Link className="action-link" href="/app/university">
                  Условия доступа →
                </Link>
              </section>
              <section className="frame stat">
                <h2>Чтение книги</h2>
                <p>
                  {bookParts.length
                    ? `${bookParts.filter((part) => progress.book.read[part.id]?.value).length}/${bookParts.length} частей прочитано`
                    : "Структура книги пока не добавлена"}
                </p>
                <p className="dim">
                  Отметки чтения не подменяют результаты тестов.
                </p>
                <Link className="action-link" href="/app/book">
                  Открыть книгу →
                </Link>
              </section>
              <section className="frame stat">
                <h2>Тесты по книге</h2>
                <p>
                  {tested.length
                    ? `${tested.length} тестов · ${tested.reduce((n, part) => n + quizScore(part, progress.book.tests[part.id].answers), 0)}/${tested.reduce((n, part) => n + part.questions.length, 0)} верных ответов`
                    : "Результатов пока нет"}
                </p>
                <p className="dim">
                  {bookParts.length
                    ? "Учитывается последняя попытка каждого теста."
                    : "Тесты появятся после добавления материалов. Проверочный пример в статистику не входит."}
                </p>
                <Link className="action-link" href="/app/book">
                  К тестам →
                </Link>
              </section>
            </div>
          )}
          <Account />
        </>
      )}
    </div>
  );
}
function Account() {
  const { user, configured, connect, disconnect, importGuest } = useProgress();
  const [mode, setMode] = useState<"login" | "register">("login");
  const [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [imported, setImported] = useState(false);
  useEffect(() => {
    setImported(false);
    setError("");
  }, [user?.id]);
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    const data = new FormData(event.currentTarget);
    try {
      await connect({
        action: mode,
        name: String(data.get("name")),
        password: String(data.get("password")),
        invite: String(data.get("invite") || ""),
      });
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="frame account">
      <h2>{user ? `Участник: ${user.name}` : "Подключиться к команде"}</h2>
      {user ? (
        <>
          <p className="dim">
            Этот профиль доступен на других устройствах по имени и паролю.
            Локальный профиль хранится отдельно.
          </p>
          <div className="row actions-inline">
            <button
              className="ghost"
              disabled={busy || imported}
              onClick={() => {
                importGuest();
                setImported(true);
              }}
            >
              Перенести мой локальный прогресс
            </button>
            <button
              className="ghost"
              disabled={busy}
              onClick={async () => {
                setBusy(true);
                try {
                  await disconnect();
                } catch (e) {
                  setError((e as Error).message);
                } finally {
                  setBusy(false);
                }
              }}
            >
              Выйти
            </button>
          </div>
          {imported && (
            <p role="status">
              Локальные результаты объединены с вашим профилем.
            </p>
          )}
        </>
      ) : (
        <>
          <p className="prose dim">
            Общие результаты доступны только участникам команды. Для первого
            входа нужны приглашение организатора, уникальное имя и пароль.
            Используйте имя, которое готовы показать команде.
          </p>
          {!configured ? (
            <p className="notice">
              Общий доступ еще не настроен. Организатору нужно настроить
              приглашения на сервере. Локальное обучение доступно.
            </p>
          ) : (
            <>
              <div className="tasks">
                <button
                  className={mode === "login" ? "active" : "ghost"}
                  aria-pressed={mode === "login"}
                  onClick={() => setMode("login")}
                >
                  Войти
                </button>
                <button
                  className={mode === "register" ? "active" : "ghost"}
                  aria-pressed={mode === "register"}
                  onClick={() => setMode("register")}
                >
                  Я здесь впервые
                </button>
              </div>
              <form className="account-form" onSubmit={submit}>
                <label>
                  Имя участника
                  <input
                    name="name"
                    required
                    minLength={2}
                    maxLength={32}
                    autoComplete="username"
                    placeholder="2–32 буквы, цифры, _ или -"
                  />
                </label>
                <label>
                  Пароль
                  <input
                    name="password"
                    type="password"
                    required
                    minLength={10}
                    maxLength={128}
                    autoComplete={
                      mode === "register" ? "new-password" : "current-password"
                    }
                  />
                </label>
                {mode === "register" && (
                  <label>
                    Код приглашения
                    <input
                      name="invite"
                      type="password"
                      required
                      autoComplete="off"
                    />
                  </label>
                )}
                <button disabled={busy} type="submit">
                  {busy
                    ? "Подключение…"
                    : mode === "register"
                      ? "Присоединиться"
                      : "Войти в команду"}
                </button>
              </form>
              <p className="dim small">
                Сохраните пароль: самостоятельное восстановление доступа пока не
                предусмотрено.
              </p>
            </>
          )}
        </>
      )}
      {error && (
        <p className="fail" role="alert">
          {error}
        </p>
      )}
    </section>
  );
}
function Leaderboard() {
  const { user } = useProgress();
  const [rows, setRows] = useState<LeaderboardRow[] | null>(null),
    [error, setError] = useState(""),
    [loading, setLoading] = useState(false),
    [attempt, setAttempt] = useState(0);
  useEffect(() => {
    setRows(null);
    setError("");
    if (!user) return;
    let live = true,
      active = false;
    async function load() {
      if (active) return;
      active = true;
      setLoading(true);
      try {
        const data = await api<{ rows: LeaderboardRow[]; userId: string }>(
          "/api/team/leaderboard",
        );
        if (live) {
          if (data.userId !== user?.id)
            throw new Error("Участник изменился. Обновите страницу.");
          setRows(data.rows);
          setError("");
        }
      } catch (e) {
        if (live) setError((e as Error).message);
      } finally {
        active = false;
        if (live) setLoading(false);
      }
    }
    void load();
    const timer = window.setInterval(() => {
      if (document.visibilityState === "visible") void load();
    }, 15000);
    window.addEventListener("focus", load);
    return () => {
      live = false;
      clearInterval(timer);
      window.removeEventListener("focus", load);
    };
  }, [user?.id, attempt]);
  if (!user)
    return (
      <section className="frame empty-state">
        <h2>Войдите, чтобы увидеть команду</h2>
        <p>
          Лидерборд использует общий источник результатов. Подключитесь ниже,
          чтобы поделиться своим прогрессом и увидеть участников.
        </p>
      </section>
    );
  return (
    <section className="frame leaderboard">
      <div className="pane-content">
        <h2>Лидерборд</h2>
        <p className="prose dim">
          Место определяется числом решенных задач Python. Подсказки допустимы.
          Равное число задач — одинаковое место: 1, 1, 3. Остальные показатели
          показаны отдельно и на место не влияют.
        </p>
        <button
          className="ghost"
          disabled={loading}
          onClick={() => setAttempt((n) => n + 1)}
        >
          Обновить результаты
        </button>
        <span className="dim small"> Обновление каждые 15 секунд</span>
        {loading && <p role="status">Загружаем результаты команды…</p>}
        {error && (
          <p className="fail" role="alert">
            {error}
            {rows ? " Ниже последние загруженные данные." : ""}
          </p>
        )}
        {rows?.length === 0 && <p>В команде пока нет участников.</p>}
        {!!rows?.length && (
          <div
            className="table-scroll"
            tabIndex={0}
            role="region"
            aria-label="Результаты команды"
          >
            <table>
              <caption>
                Общие результаты · ваш профиль отмечен словом «вы»
              </caption>
              <thead>
                <tr>
                  <th scope="col">Место</th>
                  <th scope="col">Участник</th>
                  <th scope="col">Задачи Python</th>
                  <th scope="col">Уроки</th>
                  <th scope="col">Книга: чтение</th>
                  <th scope="col">Книга: тесты</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr
                    key={row.id}
                    className={row.id === user.id ? "current-user" : ""}
                  >
                    <td>{row.rank}</td>
                    <th scope="row">
                      {row.name}
                      {row.id === user.id ? " · вы" : ""}
                    </th>
                    <td>
                      {row.solved}/{allTaskKeys().length}
                    </td>
                    <td>
                      {row.lessons}/{orderedLessons.length}
                    </td>
                    <td>
                      {row.read === null
                        ? "Нет материалов"
                        : `${row.read}/${bookParts.length}`}
                    </td>
                    <td>
                      {row.quizTotal === null
                        ? "Нет результатов"
                        : `${row.quizCorrect}/${row.quizTotal}`}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <p className="dim small">
          Университетский курс: материалы готовятся. Проверки Python выполняются
          в браузере; результаты предназначены для учебного сравнения внутри
          команды.
        </p>
      </div>
    </section>
  );
}
