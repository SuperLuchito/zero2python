// Uses the project's TypeScript compiler and Node assertions; no test framework.
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const ts = require("typescript");
require.extensions[".ts"] = (module, filename) =>
  module._compile(
    ts.transpileModule(fs.readFileSync(filename, "utf8"), {
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        target: ts.ScriptTarget.ES2022,
      },
    }).outputText,
    filename,
  );
const {
  emptyProgress,
  normalizeProgress,
  mergeProgress,
  combine,
  taskKey,
  counts,
} = require("../lib/progress.ts");
const {
  orderedLessons,
  blockingLesson,
  lessonDone,
  universityAccess,
} = require("../lib/access.ts");
const { allTaskKeys } = require("../content/curriculum.ts");
const { demoParts, quizScore } = require("../content/book.ts");
const { rankMembers } = require("../lib/leaderboard.ts");
const first = orderedLessons[0],
  second = orderedLessons[1];
const complete = (p, lesson) =>
  lesson.tasks.forEach((t) => (p.tasks[taskKey(lesson.id, t.id)] = "solved"));
const p = emptyProgress();
assert.equal(blockingLesson(first.id, p), undefined);
assert.equal(blockingLesson(second.id, p).id, first.id);
p.tasks[taskKey(first.id, first.tasks[0].id)] = "hinted";
assert.equal(lessonDone(first.id, p), false);
complete(p, first);
p.tasks[taskKey(first.id, first.tasks[0].id)] = "gave_up";
assert.equal(lessonDone(first.id, p), false);
assert.equal(blockingLesson(second.id, p).id, first.id);
p.tasks[taskKey(first.id, first.tasks[0].id)] = "solved_hinted";
assert.equal(lessonDone(first.id, p), true);
assert.equal(blockingLesson(second.id, p), undefined);
const old = normalizeProgress({
  tasks: { ...p.tasks },
  qotd: { "2026-09-05": { qid: "example", ok: true } },
});
assert.deepEqual(old.tasks, p.tasks);
assert.deepEqual(old.book, { read: {}, tests: {} });
assert.equal(
  lessonDone(first.id, normalizeProgress(JSON.parse(JSON.stringify(old)))),
  true,
);
const gap = emptyProgress();
complete(gap, orderedLessons[4]);
assert.equal(blockingLesson(orderedLessons[4].id, gap), undefined);
assert.equal(blockingLesson(orderedLessons[5].id, gap).id, first.id);
assert.deepEqual(
  normalizeProgress({
    tasks: { invalid: "fake" },
    book: { read: null, tests: { bad: { answers: [-1], at: 1 } } },
  }),
  emptyProgress(),
);
assert.equal(combine("solved", "gave_up"), "solved");
assert.equal(combine("hinted", "solved"), "solved_hinted");
assert.equal(counts(p.tasks, allTaskKeys()).done, first.tasks.length);
assert.equal(universityAccess(p, null, false).state, "requirements-pending");
assert.equal(
  universityAccess(emptyProgress(), [first.id], true).state,
  "prerequisites-missing",
);
assert.equal(universityAccess(p, [first.id], false).state, "materials-pending");
assert.equal(universityAccess(p, [first.id], true).state, "available");
const book = emptyProgress();
book.book.read["demo-interface"] = { value: true, at: 1 };
assert.deepEqual(book.book.tests, {});
book.book.tests["demo-interface"] = { answers: [0, 0], at: 2 };
assert.equal(
  quizScore(demoParts[0], book.book.tests["demo-interface"].answers),
  1,
);
book.book.read["demo-interface"] = { value: false, at: 3 };
assert.equal(book.book.tests["demo-interface"].answers.length, 2);
assert.deepEqual(normalizeProgress(JSON.parse(JSON.stringify(book))), book);
const other = emptyProgress();
complete(other, second);
other.book.read["demo-interface"] = { value: true, at: 1 };
assert.equal(
  mergeProgress(book, other).book.read["demo-interface"].value,
  false,
);
assert.equal(
  counts(mergeProgress(p, other).tasks, allTaskKeys()).done,
  first.tasks.length + second.tasks.length,
);
const ranked = rankMembers([
  { id: "a", name: "Alpha", progress: p },
  { id: "b", name: "Beta", progress: p },
  { id: "c", name: "Gamma", progress: emptyProgress() },
]);
assert.deepEqual(
  ranked.map((r) => r.rank),
  [1, 1, 3],
);
assert.equal(ranked[0].read, null);
// Browser storage: legacy data, recovery, unavailable storage and another tab's snapshot.
const saved = new Map();
global.window = new EventTarget();
global.localStorage = {
  getItem: (key) => saved.get(key) ?? null,
  setItem: (key, value) => saved.set(key, value),
};
const storage = require("../lib/storage.ts");
saved.set(storage.GUEST_KEY, JSON.stringify(old));
storage.selectProgress(storage.GUEST_KEY);
assert.equal(lessonDone(first.id, storage.getProgress()), true);
saved.set(storage.GUEST_KEY, JSON.stringify(other));
storage.markTask(first.id, first.tasks[0].id, "solved");
assert.equal(lessonDone(second.id, storage.getProgress()), true);
storage.selectProgress("broken");
saved.set("broken", "{bad JSON");
storage.readProgress("broken");
storage.saveProgress(emptyProgress());
assert.equal(saved.get("broken.recovery"), "{bad JSON");
const write = localStorage.setItem;
localStorage.setItem = () => {
  throw new Error("Quota exceeded");
};
storage.markTask(first.id, first.tasks[0].id, "solved");
assert(storage.getStorageError().includes("Не удалось сохранить"));
assert.equal(
  storage.getProgress().tasks[taskKey(first.id, first.tasks[0].id)],
  "solved",
);
localStorage.setItem = write;
delete global.window;
delete global.localStorage;
const dir = fs.mkdtempSync(path.join(os.tmpdir(), "zero2python-check-"));
process.env.TEAM_DB_PATH = path.join(dir, "team.sqlite");
process.env.TEAM_INVITE_CODE = "synthetic-invitation-for-checks";
const team = require("../lib/server/team.ts");
(async () => {
  try {
    await assert.rejects(
      () =>
        team.authenticate({
          action: "register",
          name: "TestUser",
          password: "synthetic-password",
          invite: "wrong",
        }),
      (e) => e.status === 403,
    );
    const a = await team.authenticate({
      action: "register",
      name: "TestUser",
      password: "synthetic-password",
      invite: process.env.TEAM_INVITE_CODE,
    });
    const b = await team.authenticate({
      action: "register",
      name: "SecondUser",
      password: "synthetic-password",
      invite: process.env.TEAM_INVITE_CODE,
    });
    assert.equal(team.sessionMember(a.token).id, a.member.id);
    assert.equal(team.sessionMember("invalid"), undefined);
    await assert.rejects(
      () =>
        team.authenticate({
          action: "login",
          name: "TestUser",
          password: "wrong-password",
        }),
      (e) => e.status === 401,
    );
    const again = await team.authenticate({
      action: "login",
      name: "testuser",
      password: "synthetic-password",
    });
    assert.equal(again.member.id, a.member.id);
    team.syncProgress(a.member, p);
    const merged = team.syncProgress(a.member, other);
    assert.equal(
      counts(merged.tasks, allTaskKeys()).done,
      first.tasks.length + second.tasks.length,
    );
    assert.deepEqual(merged.book, { read: {}, tests: {} });
    assert.deepEqual(
      JSON.parse(team.sessionMember(b.token).progress),
      emptyProgress(),
    );
    assert.deepEqual(team.canonicalProgress(book).book, {
      read: {},
      tests: {},
    });
    assert.deepEqual(
      team.canonicalProgress({ tasks: { unknown: "solved" } }).tasks,
      {},
    );
    // A separate Node process opens the same durable database.
    const { execFileSync } = require("node:child_process");
    const stored = execFileSync(
      process.execPath,
      [
        "-e",
        'const {DatabaseSync}=require("node:sqlite"); const db=new DatabaseSync(process.env.TEAM_DB_PATH); console.log(db.prepare("SELECT count(*) AS n FROM members").get().n); db.close();',
      ],
      { encoding: "utf8" },
    );
    assert.equal(stored.trim(), "2");
    console.log(
      "PASS: lesson access, v1 migration, hints/give-up, book independence, merge, ranks, auth and durable shared SQLite.",
    );
  } finally {
    team.db().close();
    fs.rmSync(dir, { recursive: true, force: true });
  }
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
