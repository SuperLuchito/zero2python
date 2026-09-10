# Zero to Python

Платформа команды для изучения Python, нейросетей и анализа данных. 24 модуля Python, 33 темы, русскоязычные видео, 79 встроенных заданий и 99 подборок задач LeetCode. Книжный курс: 16 глав «Грокаем глубокое обучение», 48 вопросов с объяснениями и пошаговыми схемами.

Вход по одному из трёх никнеймов: Lukyan, Maria, Egor. Паролей нет: это выбор профиля для доверенной команды. Общий прогресс хранится в D1, подтверждения LeetCode — в R2. Лидерборд считает только решённые задачи Python. Раздел «Анализ данных Дубовик» ожидает материалы преподавателя.

## Локальный запуск

Node.js 22.13+ (проверено на Node.js 26). После установки:

```bash
npm ci
npm run build
npm run db:local
npm start
```

Откройте адрес, напечатанный Wrangler. Для порта 3010: `npm start -- --ip 127.0.0.1 --port 3010`.

`npm run dev` запускает только Next.js для работы над интерфейсом. Полный сценарий с входом требует сборки и `npm start`: API обслуживается Cloudflare Worker, не Next.js. При изменении исходников пересоберите приложение; Wrangler подхватит новый dist.

## Проверки

```bash
node node_modules/typescript/bin/tsc --noEmit --incremental false
node tests/materials.cjs
node tests/book.cjs
node tests/accounts.mjs
node tests/completion.cjs
node tests/highlight.cjs
node tests/markdown.cjs
```

`tests/accounts.mjs` запускается после сборки. Проверки Pyodide: `tests/worker.cjs` и `scripts/verify-pyodide.cjs`, с `PYODIDE_PACKAGE`, указывающим на установленный Pyodide 0.26.4.

## Размещение

Сайт размещается в Sites: Next.js static export + Cloudflare Worker, D1 и R2. `npm run build` готовит `dist/server/index.js`, `dist/client` и миграции. `.openai/hosting.json` содержит только идентификатор проекта и логические привязки. Реальные ресурсы создаёт Sites; секреты не входят в репозиторий. Локальная конфигурация Wrangler не предназначена для прямого production deploy.

Миграции генерируются `npm run db:generate`; применённые миграции не редактировать. PDF книги, локальная база, пользовательские скриншоты, кеши и сборка не входят в Git.

Первая загрузка Python требует сети; код выполняется в Web Worker браузера с лимитом времени. Учебные проверки видны клиенту. Зачёт LeetCode основан на прикреплении изображения и не использует OCR. Черновики кода хранятся только на текущем устройстве; результаты и скриншоты синхронизируются.

[Продукт](docs/product.md) · [Система](docs/system.md) · [Решения](docs/decisions/README.md) · [GitHub](https://github.com/SuperLuchito/zero2python)
