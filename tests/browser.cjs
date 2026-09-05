// Run against a disposable local server with TEAM_INVITE_CODE set.
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || "playwright");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const url = process.env.TEST_URL || "http://127.0.0.1:3107";
const invite = process.env.TEST_INVITE || "synthetic-browser-invitation";
const out = process.env.TEST_OUTPUT || "outputs/browser";
fs.mkdirSync(out, { recursive: true });
const errors = [];
const wait = async (page, text) =>
  page
    .getByText(text, { exact: false })
    .first()
    .waitFor({ state: "visible", timeout: 20000 });
async function noOverflow(page) {
  assert(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth + 1,
    ),
    "Page has horizontal overflow",
  );
}
async function register(page, name) {
  await page.goto(url + "/app/progress");
  await page.getByRole("button", { name: "Я здесь впервые" }).click();
  await page.getByLabel("Имя участника").fill(name);
  await page.getByLabel("Пароль", { exact: true }).fill("synthetic-password");
  await page.getByLabel("Код приглашения").fill(invite);
  await page
    .getByRole("button", { name: "Присоединиться", exact: true })
    .click();
  await wait(page, `Участник: ${name}`);
}
(async () => {
  const browser = await chromium.launch({ channel: "chrome", headless: true });
  try {
    const a = await browser.newContext({
      viewport: { width: 1440, height: 1000 },
    });
    const b = await browser.newContext({
      viewport: { width: 1440, height: 1000 },
    });
    const page = await a.newPage(),
      peer = await b.newPage();
    for (const p of [page, peer])
      p.on("pageerror", (error) => errors.push(error.message));
    await page.goto(url + "/app/lesson/closures");
    await wait(page, "Сначала пройдите предыдущий урок");
    assert.equal(await page.locator("textarea").count(), 0);
    await page.goto(url + "/app");
    await wait(page, "Продолжить");
    assert.equal(
      await page.locator('a[aria-current="page"]').first().textContent(),
      "Карта",
    );
    await noOverflow(page);
    await page.screenshot({ path: `${out}/map-desktop.png`, fullPage: true });
    await page.goto(url + "/app/lesson/mutability");
    await page.getByRole("button", { name: "Подсказка", exact: true }).click();
    await page.getByRole("button", { name: "Сдаться", exact: true }).click();
    await wait(page, "Разбор открыт · не засчитано");
    await page.goto(url + "/app/lesson/closures");
    await wait(page, "Сначала пройдите предыдущий урок");
    await page.goto(url + "/app/lesson/mutability");
    const box = await page.locator(".editor-pane").boundingBox(),
      material = await page.locator(".material-pane").boundingBox();
    assert(
      Math.abs(box.y - material.y) < 2 && box.x > material.x,
      "Wide panels must align",
    );
    await page
      .getByRole("button", { name: "Проверить решение" })
      .waitFor({ timeout: 120000 });
    await page.waitForFunction(
      () =>
        !Array.from(document.querySelectorAll("button")).find(
          (b) => b.textContent === "Проверить решение",
        )?.disabled,
      { timeout: 120000 },
    );
    await page
      .locator("textarea")
      .fill("def append_copy(xs, v):\n    return xs + [v]\n");
    await page
      .getByRole("button", { name: "Запустить код", exact: true })
      .click();
    await wait(page, "Для зачета задачи");
    assert.equal(
      await page.evaluate(
        () =>
          JSON.parse(localStorage.getItem("py-term.v1")).tasks[
            "mutability::copy-append"
          ],
      ),
      "gave_up",
    );
    await page.getByRole("button", { name: "Проверить решение" }).click();
    await wait(page, "Все проверки пройдены.");
    await page.getByRole("button", { name: /2\. тот же объект/ }).click();
    await page
      .locator("textarea")
      .fill("def scale_inplace(xs, k):\n    return [x*k for x in xs]\n");
    await page.getByRole("button", { name: "Проверить решение" }).click();
    await wait(page, "AssertionError");
    await page
      .locator("textarea")
      .fill(
        "def scale_inplace(xs, k):\n    xs[:] = [x*k for x in xs]\n    return xs\n",
      );
    await page.getByRole("button", { name: "Проверить решение" }).click();
    await wait(page, "Все задания урока решены.");
    await page.screenshot({
      path: `${out}/lesson-desktop.png`,
      fullPage: true,
    });
    await page.reload();
    await wait(page, "Все задания урока решены.");
    await page.goto(url + "/app/lesson/closures");
    await page.locator("textarea").waitFor();
    await page.goto(url + "/app/book");
    await wait(page, "Книга еще не добавлена");
    await page.screenshot({ path: `${out}/book-desktop.png`, fullPage: true });
    await page
      .getByRole("link", { name: "Открыть проверочный пример интерфейса →" })
      .click();
    await page.getByLabel("Прочитано", { exact: true }).check();
    await page
      .getByRole("button", { name: "Начать тест", exact: true })
      .click();
    await page.getByLabel("Материал прочитан", { exact: true }).check();
    await page.getByLabel("Один", { exact: true }).check();
    await page
      .getByRole("button", { name: "Завершить тест", exact: true })
      .click();
    await wait(page, "Результат: 1/2");
    await page.getByLabel("Прочитано", { exact: true }).uncheck();
    await page.reload();
    await wait(page, "Результат: 1/2");
    assert.equal(
      await page.getByLabel("Прочитано", { exact: true }).isChecked(),
      false,
    );
    await page.screenshot({
      path: `${out}/book-demo-desktop.png`,
      fullPage: true,
    });
    await page.goto(url + "/app/university");
    await wait(page, "Точные предпосылки пока не определены");
    await page.screenshot({
      path: `${out}/university-desktop.png`,
      fullPage: true,
    });
    const suffix = Date.now().toString().slice(-7),
      nameA = `TestA_${suffix}`,
      nameB = `TestB_${suffix}`;
    await register(page, nameA);
    await register(peer, nameB);
    await page
      .getByRole("button", {
        name: "Перенести мой локальный прогресс",
        exact: true,
      })
      .click();
    await wait(page, "Локальные результаты объединены");
    await page.waitForFunction(() =>
      document
        .querySelector(".sync-line")
        ?.textContent.includes("синхронизирован"),
    );
    await peer.getByRole("link", { name: "Лидерборд", exact: true }).click();
    await wait(peer, nameA);
    const otherRow = peer.getByRole("row").filter({ hasText: nameA });
    assert(
      (await otherRow.innerText()).includes("2/20"),
      "Second browser must see first member progress",
    );
    assert(
      (
        await peer.getByRole("row").filter({ hasText: nameB }).innerText()
      ).includes("0/20"),
    );
    await peer.reload();
    await wait(peer, nameA);
    await peer.screenshot({
      path: `${out}/leaderboard-desktop.png`,
      fullPage: true,
    });
    await page.goto(url + "/app/progress");
    await wait(page, `Участник: ${nameA}`);
    assert.equal(
      await page
        .getByText("Структура книги пока не добавлена", { exact: true })
        .count(),
      1,
    );
    await page.getByRole("button", { name: "Выйти", exact: true }).click();
    await wait(page, "Локальный профиль");
    await page.getByLabel("Имя участника").fill(nameA);
    await page.getByLabel("Пароль", { exact: true }).fill("synthetic-password");
    await page
      .getByRole("button", { name: "Войти в команду", exact: true })
      .click();
    await wait(page, `Участник: ${nameA}`);
    await page.screenshot({
      path: `${out}/progress-desktop.png`,
      fullPage: true,
    });
    // Pending account progress survives a network failure and retries explicitly.
    await page.route("**/api/team/progress", (route) => route.abort());
    await page.goto(url + "/app/qotd");
    await page.locator(".qotd-choices button").first().click();
    await page
      .getByRole("button", { name: "Зафиксировать", exact: true })
      .click();
    await page.goto(url + "/app/progress");
    await page
      .getByRole("button", { name: "Повторить синхронизацию", exact: true })
      .waitFor();
    await page.unroute("**/api/team/progress");
    await page
      .getByRole("button", { name: "Повторить синхронизацию", exact: true })
      .click();
    await page.waitForFunction(() =>
      document
        .querySelector(".sync-line")
        ?.textContent.includes("синхронизирован"),
    );
    const synced = await (await a.request.get(url + "/api/team/auth")).json();
    assert.equal(Object.keys(synced.progress.qotd).length, 1);
    await page.goto(url + "/app/qotd");
    assert.equal(
      await page.locator(".qotd-choices button:disabled").count(),
      await page.locator(".qotd-choices button").count(),
    );

    // Narrow views and keyboard escape from editor.
    await page.setViewportSize({ width: 390, height: 844 });
    for (const [route, name] of [
      ["/app", "map"],
      ["/app/lesson/mutability", "lesson"],
      ["/app/book", "book"],
      ["/app/university", "university"],
      ["/app/progress", "progress"],
      ["/app/progress/leaderboard", "leaderboard"],
    ]) {
      await page.goto(url + route);
      await page.locator("h1").waitFor();
      await page.waitForFunction(
        () =>
          !document.body.textContent.includes("Загружаем прогресс…") &&
          !document.body.textContent.includes("Проверяем доступ к уроку…"),
      );
      await noOverflow(page);
      await page.screenshot({
        path: `${out}/${name}-mobile.png`,
        fullPage: true,
      });
    }
    await page.goto(url + "/app/lesson/mutability");
    await page.locator("textarea").waitFor();
    const mobileEditor = await page.locator(".editor-pane").boundingBox(),
      mobileMaterial = await page.locator(".material-pane").boundingBox();
    assert(
      mobileEditor.y >= mobileMaterial.y + mobileMaterial.height,
      "Narrow editor must follow material",
    );
    await page.locator("textarea").focus();
    await page.keyboard.press("Tab");
    assert.equal(
      await page
        .locator("textarea")
        .evaluate((el) => document.activeElement === el),
      false,
      "Editor must not trap focus",
    );
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    assert.equal(
      Math.round((await page.locator(".topbar").boundingBox()).y),
      0,
      "Navigation stays visible",
    );
    await peer.route("**/api/team/leaderboard", (route) => route.abort());
    await peer
      .getByRole("button", { name: "Обновить результаты", exact: true })
      .click();
    await peer.getByRole("alert").waitFor();
    // API trust boundaries, independently from UI state.
    const anonymous = await browser.newContext();
    assert.equal(
      (await anonymous.request.get(url + "/api/team/leaderboard")).status(),
      401,
    );
    assert.equal(
      (
        await a.request.put(url + "/api/team/progress", {
          data: { userId: "someone-else", progress: {} },
          headers: { Origin: url },
        })
      ).status(),
      409,
    );
    assert.equal(
      (
        await a.request.put(url + "/api/team/progress", {
          data: {},
          headers: { Origin: "https://unrelated.invalid" },
        })
      ).status(),
      403,
    );
    const guest = await browser.newContext();
    const tabA = await guest.newPage(),
      tabB = await guest.newPage();
    await Promise.all([
      tabA.goto(url + "/app/lesson/mutability"),
      tabB.goto(url + "/app/lesson/mutability"),
    ]);
    await tabB.getByRole("button", { name: /2\. тот же объект/ }).click();
    await Promise.all([
      tabA.getByRole("button", { name: "Подсказка", exact: true }).click(),
      tabB.getByRole("button", { name: "Подсказка", exact: true }).click(),
    ]);
    await tabA.waitForFunction(
      () =>
        Object.keys(JSON.parse(localStorage.getItem("py-term.v1")).tasks)
          .length === 2,
    );
    await tabA.reload();
    await tabA
      .getByRole("button", { name: "Подсказка", exact: true })
      .waitFor();
    assert.equal(
      await tabA
        .getByRole("button", { name: "Подсказка", exact: true })
        .isDisabled(),
      true,
    );
    await guest.close();
    const unavailable = await browser.newContext();
    await unavailable.addInitScript(() => {
      Storage.prototype.setItem = () => {
        throw new DOMException("Quota exceeded", "QuotaExceededError");
      };
    });
    const quotaPage = await unavailable.newPage();
    await quotaPage.goto(url + "/app");
    await quotaPage
      .getByRole("alert")
      .filter({ hasText: "Не удалось сохранить прогресс" })
      .waitFor();
    await unavailable.close();

    assert.deepEqual(errors, [], "No browser runtime errors");
    console.log(
      "PASS: real Pyodide, lesson access, book demo, reload, two independent members, shared leaderboard, responsive layouts, keyboard, network failure, API access.",
    );
  } finally {
    await browser.close();
  }
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
