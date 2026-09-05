import {
  createHash,
  randomBytes,
  randomUUID,
  scrypt,
  timingSafeEqual,
} from "node:crypto";
import { mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { DatabaseSync } from "node:sqlite";
import { allTaskKeys } from "../../content/curriculum";
import { bookParts } from "../../content/book";
import {
  emptyProgress,
  mergeProgress,
  normalizeProgress,
  type Progress,
} from "../progress";

export class HttpError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}
let database: DatabaseSync | undefined;
export function db() {
  if (!database) {
    const path = resolve(
      process.env.TEAM_DB_PATH || "data/private/team.sqlite",
    );
    mkdirSync(dirname(path), { recursive: true, mode: 0o700 });
    database = new DatabaseSync(path);
    database.exec(`PRAGMA journal_mode=WAL; PRAGMA busy_timeout=5000; PRAGMA foreign_keys=ON;
      CREATE TABLE IF NOT EXISTS members (id TEXT PRIMARY KEY, name TEXT NOT NULL UNIQUE COLLATE NOCASE, password TEXT NOT NULL, progress TEXT NOT NULL);
      CREATE TABLE IF NOT EXISTS sessions (token TEXT PRIMARY KEY, member_id TEXT NOT NULL REFERENCES members(id), expires INTEGER NOT NULL);
      CREATE TABLE IF NOT EXISTS attempts (key TEXT PRIMARY KEY, count INTEGER NOT NULL, expires INTEGER NOT NULL);`);
  }
  return database;
}
export const hash = (text: string) =>
  createHash("sha256").update(text).digest("hex");
export const teamConfigured = () =>
  (process.env.TEAM_INVITE_CODE?.length ?? 0) >= 16;
export type Member = { id: string; name: string; progress: string };
export function sessionMember(token?: string): Member | undefined {
  if (!token) return undefined;
  return db()
    .prepare(
      "SELECT m.id, m.name, m.progress FROM members m JOIN sessions s ON s.member_id = m.id WHERE s.token = ? AND s.expires > ?",
    )
    .get(hash(token), Date.now()) as Member | undefined;
}
export function throttle(key: string, limit: number) {
  const now = Date.now();
  db().prepare("DELETE FROM attempts WHERE expires < ?").run(now);
  const row = db()
    .prepare(
      `INSERT INTO attempts VALUES (?, 1, ?) ON CONFLICT(key) DO UPDATE SET count = count + 1 RETURNING count`,
    )
    .get(key, now + 60_000) as { count: number };
  if (row.count > limit)
    throw new HttpError(429, "Слишком много попыток. Подождите минуту.");
}
const derive = (password: string, salt: string) =>
  new Promise<Buffer>((resolve, reject) =>
    scrypt(password, salt, 64, (error, key) =>
      error ? reject(error) : resolve(key),
    ),
  );
export async function authenticate(input: Record<string, unknown>) {
  if (!teamConfigured())
    throw new HttpError(
      503,
      "Общий доступ еще не настроен. Попросите организатора настроить приглашения команды.",
    );
  const { action, password, invite } = input;
  const name = typeof input.name === "string" ? input.name.trim() : "";
  if (
    !["login", "register"].includes(String(action)) ||
    !/^[\p{L}\p{N}_-]{2,32}$/u.test(name) ||
    typeof password !== "string" ||
    password.length < 10 ||
    password.length > 128
  )
    throw new HttpError(
      400,
      "Имя: 2–32 буквы, цифры, _ или -. Пароль: 10–128 символов.",
    );
  throttle("auth:global", 60);
  throttle(`auth:${name.toLowerCase()}`, 10);
  let member = db()
    .prepare("SELECT * FROM members WHERE name = ? COLLATE NOCASE")
    .get(name) as (Member & { password: string }) | undefined;
  if (action === "register") {
    if (
      typeof invite !== "string" ||
      !timingSafeEqual(
        Buffer.from(hash(invite)),
        Buffer.from(hash(process.env.TEAM_INVITE_CODE!)),
      )
    )
      throw new HttpError(
        403,
        "Приглашение не подходит. Проверьте код у организатора.",
      );
    if (member)
      throw new HttpError(409, "Это имя занято. Войдите или выберите другое.");
    const salt = randomBytes(16).toString("hex");
    const encoded = `${salt}:${(await derive(password, salt)).toString("hex")}`;
    const id = randomUUID();
    try {
      db()
        .prepare("INSERT INTO members VALUES (?, ?, ?, ?)")
        .run(id, name, encoded, JSON.stringify(emptyProgress()));
    } catch (error) {
      if (
        db()
          .prepare("SELECT id FROM members WHERE name = ? COLLATE NOCASE")
          .get(name)
      )
        throw new HttpError(409, "Это имя уже занято.");
      throw error;
    }
    member = {
      id,
      name,
      progress: JSON.stringify(emptyProgress()),
      password: encoded,
    };
  } else {
    const [salt, stored] = member?.password.split(":") ?? [
      "missing-member-salt",
      "00".repeat(64),
    ];
    const key = await derive(password, salt);
    if (!member || !timingSafeEqual(key, Buffer.from(stored, "hex")))
      throw new HttpError(401, "Имя или пароль не подходят.");
  }
  const token = randomBytes(32).toString("hex");
  db().prepare("DELETE FROM sessions WHERE expires <= ?").run(Date.now());
  db()
    .prepare("INSERT INTO sessions VALUES (?, ?, ?)")
    .run(hash(token), member.id, Date.now() + 30 * 86400_000);
  return { token, member };
}
export function publicMember(member: Member) {
  return { id: member.id, name: member.name };
}
export function canonicalProgress(value: unknown): Progress {
  const p = normalizeProgress(value),
    valid = new Set(allTaskKeys());
  p.tasks = Object.fromEntries(
    Object.entries(p.tasks).filter(([key]) => valid.has(key)),
  );
  p.book.read = Object.fromEntries(
    bookParts.flatMap((part) =>
      p.book.read[part.id] && p.book.read[part.id].at <= Date.now() + 60_000
        ? [[part.id, p.book.read[part.id]]]
        : [],
    ),
  );
  p.book.tests = Object.fromEntries(
    bookParts.flatMap((part) => {
      const result = p.book.tests[part.id];
      return result &&
        result.at <= Date.now() + 60_000 &&
        result.answers.length === part.questions.length &&
        result.answers.every((a, i) => a < part.questions[i].choices.length)
        ? [[part.id, result]]
        : [];
    }),
  );
  p.qotd = Object.fromEntries(
    Object.entries(p.qotd)
      .filter(
        ([day, q]) => /^\d{4}-\d{2}-\d{2}$/.test(day) && q.qid.length <= 100,
      )
      .slice(-366),
  );
  return p;
}
export function syncProgress(member: Member, value: unknown) {
  const database = db();
  database.exec("BEGIN IMMEDIATE");
  try {
    const latest = database
      .prepare("SELECT progress FROM members WHERE id = ?")
      .get(member.id) as { progress: string };
    const merged = mergeProgress(
      canonicalProgress(JSON.parse(latest.progress)),
      canonicalProgress(value),
    );
    database
      .prepare("UPDATE members SET progress = ? WHERE id = ?")
      .run(JSON.stringify(merged), member.id);
    database.exec("COMMIT");
    return merged;
  } catch (error) {
    database.exec("ROLLBACK");
    throw error;
  }
}
