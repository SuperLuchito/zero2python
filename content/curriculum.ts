import type { Lesson, Module } from "@/lib/types";

export const modules: Module[] = [
  {
    id: "base",
    title: "База, которую ты думаешь, что знаешь",
    blurb: "Типы, ссылки, замыкания. Короткий прогон, без учебника.",
    lessonIds: ["mutability", "closures", "dicts", "lists"],
  },
  {
    id: "pandas",
    title: "pandas: индекс врёт, CSV врёт громче",
    blurb: "groupby, индексы, грязный файл. Ленивая загрузка пакета.",
    lessonIds: ["pandas-index", "pandas-groupby", "pandas-csv"],
  },
  {
    id: "algo",
    title: "Алгоритмы и логические ямы",
    blurb: "Границы, хеш, жадность. Не олимпиада — ловушки.",
    lessonIds: ["bounds", "hash", "greedy"],
  },
];

export const lessons: Lesson[] = [
  {
    id: "mutability",
    title: "Срезы новые. Имена — нет.",
    module: "base",
    minutes: 12,
    needsPandas: false,
    body: [
      "int и str не меняются. list и dict меняются, даже если ты «только вернул».",
      "Срез xs[-2:] — новый список. Присваивание в элемент — удар по тому же объекту.",
      "+= на списке мутирует. + собирает другой. Если не видишь is, ты гадаешь."
    ],
    tasks: [
      {
        id: "copy-append",
        title: "append без следа",
        prompt: "Напиши append_copy(xs, v): верни новый список, исходный не трогай. xs — list.",
        starter: "def append_copy(xs, v):\n    ...\n",
        examples: [
          "append_copy([1, 2], 3) == [1, 2, 3]",
          "исходный [1, 2] жив"
        ],
        tests: "\na = [1, 2]\nb = append_copy(a, 3)\nassert b == [1, 2, 3], b\nassert a == [1, 2], a\nassert a is not b\nc = append_copy([], \"x\")\nassert c == [\"x\"]\nassert append_copy([\"a\"], \"a\") == [\"a\", \"a\"]\n",
        hint: "xs + [v] или [*xs, v]. xs.append — другая история, пишет в оригинал.",
        debrief: "Ловушка: xs.append(v); return xs и xs += [v]. Оба мутируют. Новый объект — + или копия, потом append на копии.",
      },
      {
        id: "scale-in",
        title: "тот же объект",
        prompt: "scale_inplace(xs, k) умножает каждый элемент на k на месте и возвращает тот же список (is).",
        starter: "def scale_inplace(xs, k):\n    ...\n",
        examples: [
          "scale_inplace([1, 2, 3], 10) is исходный",
          "== [10, 20, 30]"
        ],
        tests: "\na = [1, 2, 3]\nb = scale_inplace(a, 10)\nassert b == [10, 20, 30]\nassert a is b\nz = []\nassert scale_inplace(z, 3) is z\none = [4]\nscale_inplace(one, 0)\nassert one == [0]\n",
        hint: "Цикл по индексам или xs[:] = (x * k for x in xs). Не собирай новый list и не ребиндь xs.",
        debrief: "Ловушка: xs = [x * k for x in xs]; return xs — локальное имя, снаружи объект старый. Нужна мутация содержимого.",
      }
    ],
  },
  {
    id: "closures",
    title: "Замыкание ловит имя, не значение",
    module: "base",
    minutes: 14,
    needsPandas: false,
    body: [
      "Функция из цикла с lambda: i видит i на момент вызова. К концу цикла там последнее значение.",
      "Default-аргумент i=i фиксирует значение на определении. Ячейка замыкания — нет.",
      "Кэш в замыкании — нормальный паттерн. Пока не положишь туда мутабельный дефолт."
    ],
    tasks: [
      {
        id: "adders",
        title: "n функций, k-я добавляет k",
        prompt: "make_adders(n) → список из n функций. Функция с индексом k делает x + k. Индекс с нуля.",
        starter: "def make_adders(n):\n    ...\n",
        examples: [
          "make_adders(3)[0](10) == 10",
          "make_adders(3)[2](10) == 12"
        ],
        tests: "\nfns = make_adders(4)\nassert [f(0) for f in fns] == [0, 1, 2, 3]\nassert fns[2](10) == 12\nassert make_adders(1)[0](5) == 5\nassert make_adders(0) == []\n",
        hint: "Не lambda x: x + i в цикле без фиксации. lambda x, i=i: x + i или фабрика def make(i): return lambda x: x + i.",
        debrief: "Ловушка: late binding. Все лямбды смотрят на одну ячейку i. К вызову там n-1.",
      },
      {
        id: "once",
        title: "один вызов",
        prompt: "once(fn) возвращает функцию: первый вызов — fn(), дальше тот же результат, fn больше не трогать. Без аргументов.",
        starter: "def once(fn):\n    ...\n",
        examples: [
          "счётчик внутри fn растёт только один раз"
        ],
        tests: "\ncalls = {\"n\": 0}\ndef fn():\n    calls[\"n\"] += 1\n    return calls[\"n\"] * 10\ng = once(fn)\nassert g() == 10\nassert g() == 10\nassert g() == 10\nassert calls[\"n\"] == 1\nh = once(lambda: 3)\nassert h() == 3\n",
        hint: "Флаг и cached в enclosing scope. nonlocal если это bool/None, не ячейка в list/dict.",
        debrief: "Ловушка: nonlocal забыли — UnboundLocalError. Либо кладёшь состояние в мутабельную ячейку [None].",
      }
    ],
  },
  {
    id: "dicts",
    title: "Словарь не копия. Ключ не любой.",
    module: "base",
    minutes: 12,
    needsPandas: false,
    body: [
      "d2 = d1 — два имени, одна таблица. dict(d1) — мелкие ключи те же объекты-значения.",
      "list в ключ не кладётся. tuple — да, пока внутри хешируемое.",
      "d.get(k, []) потом .append — если ключа не было, ты пишешь в одноразовый список и теряешь его."
    ],
    tasks: [
      {
        id: "merge",
        title: "слияние без побочки",
        prompt: "merge_left(a, b) — новый dict. Ключи из обоих, значения из b перекрывают a. a и b не менять.",
        starter: "def merge_left(a, b):\n    ...\n",
        examples: [
          "merge_left({'x': 1}, {'x': 2, 'y': 3}) == {'x': 2, 'y': 3}"
        ],
        tests: "\na = {\"x\": 1, \"z\": 0}\nb = {\"x\": 2, \"y\": 3}\nc = merge_left(a, b)\nassert c == {\"x\": 2, \"z\": 0, \"y\": 3}\nassert a == {\"x\": 1, \"z\": 0}\nassert b == {\"x\": 2, \"y\": 3}\nassert merge_left({}, {\"a\": 1}) == {\"a\": 1}\nassert merge_left({\"a\": 1}, {}) == {\"a\": 1}\n",
        hint: "{**a, **b} или dict(a); out.update(b). Не a.update(b).",
        debrief: "Ловушка: a.update(b); return a. Ты вернул успех и сломал вход. Ещё: общий объект, если вернул a без копии.",
      },
      {
        id: "count-h",
        title: "считай только хешируемое",
        prompt: "count_hashable(items) → dict значение→число. Нехашируемое (list, dict) пропускай, не падай.",
        starter: "def count_hashable(items):\n    ...\n",
        examples: [
          "count_hashable([1, 1, [], 1, 'a']) == {1: 3, 'a': 1}"
        ],
        tests: "\nassert count_hashable([1, 1, [], 1, \"a\", {}, \"a\"]) == {1: 3, \"a\": 2}\nassert count_hashable([]) == {}\nassert count_hashable([[1], [1]]) == {}\nassert count_hashable([None, None]) == {None: 2}\nassert count_hashable([(1, 2), (1, 2), [1, 2]]) == {(1, 2): 2}\n",
        hint: "try/except TypeError вокруг d[x] = ... или hash(x). Не фильтруй только type == list — мало.",
        debrief: "Ловушка: проверить isinstance(..., list) и забыть dict/set. Лови TypeError от хеша.",
      }
    ],
  },
  {
    id: "lists",
    title: "Строка таблицы — не строка таблицы",
    module: "base",
    minutes: 12,
    needsPandas: false,
    body: [
      "[[0] * w] * h — h ссылок на один ряд. Потом «почему вся колонка».",
      "Удаление из списка, по которому идёшь вперёд, сдвигает хвост. Пропускаешь элемент.",
      "Срез справа открытый. xs[i:i] — пусто, вставка не замена."
    ],
    tasks: [
      {
        id: "grid",
        title: "сетка без алиаса",
        prompt: "grid(h, w, fill=0) — h рядов по w элементов. Разные ряды — разные списки. Запись в [0][0] не красит всю колонку.",
        starter: "def grid(h, w, fill=0):\n    ...\n",
        examples: [
          "g = grid(2, 3); g[0][0] = 9; g[1][0] == 0"
        ],
        tests: "\ng = grid(2, 3)\nassert g == [[0, 0, 0], [0, 0, 0]]\ng[0][0] = 9\nassert g[1][0] == 0\nassert g[0][1] == 0\nz = grid(0, 5)\nassert z == []\none = grid(1, 1, fill=7)\nassert one == [[7]]\none[0][0] = 1\ng2 = grid(1, 1, fill=7)\nassert g2 == [[7]]\n",
        hint: "[[fill] * w for _ in range(h)]. Не умножай внешний список.",
        debrief: "Ловушка: [[fill] * w] * h. Внутреннее * w для иммутабельного fill ок. Внешнее * h — катастрофа.",
      },
      {
        id: "drop-even",
        title: "вычистить чётные на месте",
        prompt: "drop_even_inplace(xs) удаляет чётные int из списка на месте, возвращает тот же объект. Порядок остальных сохранить.",
        starter: "def drop_even_inplace(xs):\n    ...\n",
        examples: [
          "[1, 2, 3, 4, 5] → [1, 3, 5], тот же id"
        ],
        tests: "\na = [1, 2, 3, 4, 5]\nb = drop_even_inplace(a)\nassert b == [1, 3, 5]\nassert a is b\nc = [2, 4, 6]\ndrop_even_inplace(c)\nassert c == []\nd = [1, 3]\ndrop_even_inplace(d)\nassert d == [1, 3]\ne = []\nassert drop_even_inplace(e) is e\n",
        hint: "Иди с конца. Или xs[:] = [x for x in xs if x % 2]. Не for x in xs: xs.remove пока чётное.",
        debrief: "Ловушка: итерация вперёд + del/remove. После удаления индекс указывает на элемент через один.",
      }
    ],
  },
  {
    id: "pandas-index",
    title: "Индекс — не колонка, loc — не iloc",
    module: "pandas",
    minutes: 16,
    needsPandas: true,
    body: [
      "set_index не делает ключ уникальным. loc[k] на дублях вернёт Series, не скаляр. Потом упадёшь на арифметике.",
      "reset_index возвращает бывший индекс в колонки. Если забыл — level_0 преследует.",
      "Выравнивание Series идёт по индексу, не по позиции. Два вектора одной длины складываются в NaN, если метки разъехались."
    ],
    tasks: [
      {
        id: "lookup",
        title: "lookup, даже если ключ повторяется",
        prompt: "unique_lookup(df, key): df с колонками k, v. Верни число: если k уникален — его v, если дубли — сумма v. Нет ключа — 0.",
        starter: "import pandas as pd\n\ndef unique_lookup(df, key):\n    ...\n",
        examples: [
          "один ряд с k=1, v=5 → 5",
          "два ряда k=1 → сумма"
        ],
        tests: "\nimport pandas as pd\ndf = pd.DataFrame({\"k\": [1, 2, 2, 3], \"v\": [5, 1, 4, 9]})\nassert unique_lookup(df, 1) == 5\nassert unique_lookup(df, 2) == 5\nassert unique_lookup(df, 3) == 9\nassert unique_lookup(df, 99) == 0\nassert unique_lookup(pd.DataFrame({\"k\": [], \"v\": []}), 1) == 0\n",
        hint: "s = df.groupby('k')['v'].sum() или фильтр df.loc[df.k == key, 'v'].sum(). Не set_index().loc[key] вслепую.",
        debrief: "Ловушка: set_index('k')['v'].loc[key]. На дубле это Series. int(series) падает. На отсутствии — KeyError, не 0.",
      },
      {
        id: "align",
        title: "сложить по метке",
        prompt: "align_add(a, b): две Series (pandas). Верни dict {индекс: сумма}, объединение индексов, дырки как 0, без NaN.",
        starter: "import pandas as pd\n\ndef align_add(a, b):\n    ...\n",
        examples: [
          "Series({0:1, 1:2}) + Series({1:3, 2:4}) → {0:1, 1:5, 2:4}"
        ],
        tests: "\nimport pandas as pd\na = pd.Series([1, 2], index=[0, 1])\nb = pd.Series([3, 4], index=[1, 2])\nout = align_add(a, b)\nassert out == {0: 1, 1: 5, 2: 4} or out == {0: 1.0, 1: 5.0, 2: 4.0}\na2 = pd.Series(dtype=float)\nb2 = pd.Series([1], index=[\"x\"])\nout2 = align_add(a2, b2)\nassert out2[\"x\"] == 1\n",
        hint: "a.add(b, fill_value=0). Потом .to_dict(). Не a.values + b.values.",
        debrief: "Ловушка: сложение по позиции (values). Или a + b без fill_value — NaN на дырках.",
      }
    ],
  },
  {
    id: "pandas-groupby",
    title: "groupby считает не то, что ты смотришь",
    module: "pandas",
    minutes: 16,
    needsPandas: true,
    body: [
      "По умолчанию groupby сортирует ключи. sort=False — порядок появления.",
      "as_index=True унесёт колонку в индекс. Потом g['city'] нет.",
      "argmax в группе: idxmax + loc по исходному кадру. apply с sort внутри — легко снести колонки."
    ],
    tasks: [
      {
        id: "sum-cat",
        title: "сумма по категории",
        prompt: "sum_by_cat(df) → dict категория→сумма amount. Колонки cat, amount. Пустые группы не выдумывай.",
        starter: "import pandas as pd\n\ndef sum_by_cat(df):\n    ...\n",
        examples: [
          "a:1, a:2, b:4 → {'a': 3, 'b': 4}"
        ],
        tests: "\nimport pandas as pd\ndf = pd.DataFrame({\"cat\": [\"a\", \"b\", \"a\"], \"amount\": [1, 4, 2]})\nout = dict(sum_by_cat(df))\nnorm = {k: float(v) for k, v in out.items()}\nassert norm == {\"a\": 3.0, \"b\": 4.0}\ndf2 = pd.DataFrame({\"cat\": [], \"amount\": []})\nassert dict(sum_by_cat(df2)) == {}\ndf3 = pd.DataFrame({\"cat\": [\"z\"], \"amount\": [0]})\nassert dict(sum_by_cat(df3))[\"z\"] == 0\n",
        hint: "df.groupby('cat')['amount'].sum().to_dict(). Не итерируй уникальные и фильтруй заново без нужды.",
        debrief: "Ловушка: df.groupby('cat').sum() берёт все числовые колонки и может утащить мусор. Режь ['amount'].",
      },
      {
        id: "top",
        title: "лучший в городе",
        prompt: "top_in_city(df): колонки city, name, score. Для каждого города ряд с максимальным score. Ничья — имя лексикографически меньшее. Верни list of dicts, сортировка по city.",
        starter: "import pandas as pd\n\ndef top_in_city(df):\n    ...\n",
        examples: [
          "MSK, Ann 10 / MSK, Bob 10 → Ann"
        ],
        tests: "\nimport pandas as pd\ndf = pd.DataFrame({\n    \"city\": [\"MSK\", \"MSK\", \"SPB\", \"SPB\"],\n    \"name\": [\"Bob\", \"Ann\", \"Zoe\", \"Ada\"],\n    \"score\": [10, 10, 3, 8],\n})\nout = top_in_city(df)\nassert out == [\n    {\"city\": \"MSK\", \"name\": \"Ann\", \"score\": 10},\n    {\"city\": \"SPB\", \"name\": \"Ada\", \"score\": 8},\n] or out == [\n    {\"city\": \"MSK\", \"name\": \"Ann\", \"score\": 10.0},\n    {\"city\": \"SPB\", \"name\": \"Ada\", \"score\": 8.0},\n]\n",
        hint: "Сортировка score desc, name asc, потом drop_duplicates('city').",
        debrief: "Ловушка: idxmax на score. Ничья → первый встреченный, не лексикографический. Индекс группы путают с позицией.",
      }
    ],
  },
  {
    id: "pandas-csv",
    title: "CSV, который стыдно показать pandas.read",
    module: "pandas",
    minutes: 18,
    needsPandas: true,
    body: [
      "Разделитель не запятая. Десятичная — запятая. NA пишут n/a, -, пусто.",
      "Строки-комментарии #. Хвосты пробелов в заголовке. BOM в начале файла.",
      "read_csv умеет почти всё. Если парсишь руками сплитом — сам себе враг на кавычках."
    ],
    tasks: [
      {
        id: "messy",
        title: "прочитать грязь",
        prompt: "load_messy(text) → list[dict] с ключами item (str, strip), qty (int), price (float). Сепаратор ';'. Десятичная ','. Пропуск пустых строк и с #. n/a в qty/price — отбросить ряд.",
        starter: "import pandas as pd\nimport io\n\ndef load_messy(text):\n    ...\n",
        examples: [
          "item;qty;price / apple;2;1,5"
        ],
        tests: "\ntext = \"\\ufeffitem;qty;price\\n# ignore\\napple;2;1,50\\n pear ;n/a;2,00\\nbanana;3;0,5\\n\\n\"\nrows = load_messy(text)\nassert rows == [\n    {\"item\": \"apple\", \"qty\": 2, \"price\": 1.5},\n    {\"item\": \"banana\", \"qty\": 3, \"price\": 0.5},\n] or rows == [\n    {\"item\": \"apple\", \"qty\": 2, \"price\": 1.50},\n    {\"item\": \"banana\", \"qty\": 3, \"price\": 0.5},\n]\nassert load_messy(\"item;qty;price\\n\") == []\n",
        hint: "pd.read_csv(io.StringIO(text), sep=';', decimal=',', comment='#', na_values=['n/a'], encoding='utf-8-sig'), потом dropna, astype, strip.",
        debrief: "Ловушка: split(',') на европейском CSV. Не снятый BOM прилипает к имени колонки. decimal не задан — price строка.",
      },
      {
        id: "totals",
        title: "сумма чека",
        prompt: "ticket_total(text) — тот же формат. Верни float: сумма qty*price по валидным рядам. Пусто → 0.0.",
        starter: "import pandas as pd\nimport io\n\ndef ticket_total(text):\n    ...\n",
        examples: [
          "apple 2×1.5 + banana 3×0.5 = 4.5"
        ],
        tests: "\ntext = \"item;qty;price\\napple;2;1,50\\nbanana;3;0,50\\nx;n/a;1,00\\n\"\nval = ticket_total(text)\nassert abs(float(val) - 4.5) < 1e-9\nempty = ticket_total(\"item;qty;price\\n\")\nassert float(empty) == 0.0\n",
        hint: "Переиспользуй разбор. (qty * price).sum(). Не складывай строки.",
        debrief: "Ловушка: sum по object-колонке склеит текст. Сначала числовые типы. n/a ряд не должен обнулять весь чек.",
      }
    ],
  },
  {
    id: "bounds",
    title: "Off-by-one не опечатка, а модель",
    module: "algo",
    minutes: 12,
    needsPandas: false,
    body: [
      "Полуинтервал [start, end) дружит со срезами. Включили оба конца — проверяй +1.",
      "Окно длины k: стартов n-k+1. При k==0 или k>n — пусто, не бесконечность.",
      "Если a > b в диапазоне, договорись: пусто или разверни. Молчание = баг."
    ],
    tasks: [
      {
        id: "inc-sum",
        title: "сумма включительно",
        prompt: "inclusive_sum(a, b) — сумма всех int от a до b включительно. Если a > b, разверни диапазон.",
        starter: "def inclusive_sum(a, b):\n    ...\n",
        examples: [
          "inclusive_sum(1, 3) == 6",
          "inclusive_sum(3, 1) == 6",
          "inclusive_sum(5, 5) == 5"
        ],
        tests: "\nassert inclusive_sum(1, 3) == 6\nassert inclusive_sum(3, 1) == 6\nassert inclusive_sum(5, 5) == 5\nassert inclusive_sum(-1, 1) == 0\nassert inclusive_sum(0, 0) == 0\nassert inclusive_sum(-3, -1) == -6\n",
        hint: "lo, hi = sorted((a, b)); return sum(range(lo, hi + 1)). Формула Гаусса тоже ок.",
        debrief: "Ловушка: range(a, b) без +1. И range(a, b+1) когда a>b даёт пусто — сумма 0, хотя просили развернуть.",
      },
      {
        id: "windows",
        title: "окна",
        prompt: "windows(xs, k) — список окон длины k (новые списки). k<=0 или k>len(xs) → [].",
        starter: "def windows(xs, k):\n    ...\n",
        examples: [
          "windows([1,2,3,4], 2) == [[1,2],[2,3],[3,4]]"
        ],
        tests: "\nassert windows([1, 2, 3, 4], 2) == [[1, 2], [2, 3], [3, 4]]\nassert windows([1, 2, 3], 3) == [[1, 2, 3]]\nassert windows([1, 2], 5) == []\nassert windows([1, 2, 3], 0) == []\nassert windows([], 1) == []\nxs = [1, 2, 3]\nw = windows(xs, 2)\nw[0][0] = 99\nassert xs[0] == 1\n",
        hint: "[xs[i:i+k] for i in range(0, n-k+1)] если k>0. Срез копирует — это хорошо.",
        debrief: "Ловушка: range(n-k) без +1 — теряешь последнее окно. k==0: xs[i:i] пустые окна, их n+1 штук. Не надо.",
      }
    ],
  },
  {
    id: "hash",
    title: "Равенство, ключ, порядок",
    module: "algo",
    minutes: 12,
    needsPandas: false,
    body: [
      "True is 1 — нет. True == 1 — да. В dict {True: 'a', 1: 'b'} — одна дырка.",
      "Стабильный uniquify: set не обещает порядок. dict.fromkeys хранит.",
      "list в set не кладётся. Сначала tuple, и только если элементы хешируемы."
    ],
    tasks: [
      {
        id: "dedup",
        title: "уникальные, как шли",
        prompt: "dedup_stable(xs) — первое вхождение каждого хешируемого. Порядок сохранить. Нехашируемое пропускай.",
        starter: "def dedup_stable(xs):\n    ...\n",
        examples: [
          "[1, 1, 2, 1] → [1, 2]"
        ],
        tests: "\nassert dedup_stable([1, 1, 2, 1, 3, 2]) == [1, 2, 3]\nassert dedup_stable([]) == []\nassert dedup_stable([1, [], 1, {}, 2]) == [1, 2]\nassert dedup_stable([\"a\", \"A\", \"a\"]) == [\"a\", \"A\"]\n",
        hint: "seen = set(); out=[]; ... if x in seen: continue. in list квадратично — не надо.",
        debrief: "Ловушка: list(set(xs)) — порядок и взрыв на list-элементах. True и 1 схлопнутся — семантика хеша.",
      },
      {
        id: "pairs",
        title: "счёт неупорядоченных пар",
        prompt: "count_undirected(pairs): пары из двух хешируемых. (a,b) и (b,a) — одно. a==a ок. Верни dict: ключ — tuple(sorted(pair)) даже для петель (1,1).",
        starter: "def count_undirected(pairs):\n    ...\n",
        examples: [
          "[(1,2),(2,1),(1,1)] → {(1,2):2, (1,1):1}"
        ],
        tests: "\nraw = dict(count_undirected([(1, 2), (2, 1), (1, 1), (3, 4)]))\nnorm = {}\nfor k, v in raw.items():\n    t = tuple(sorted(tuple(k)))\n    if len(t) == 1:\n        t = (t[0], t[0])\n    norm[t] = norm.get(t, 0) + v\nassert norm[(1, 2)] == 2\nassert norm[(1, 1)] == 1\nassert norm[(3, 4)] == 1\n",
        hint: "Ключ tuple(sorted(p)). frozenset ломает петлю (1,1) — станет один элемент.",
        debrief: "Ловушка: frozenset([a,b]) для a==b теряет кратность. Неупорядоченность ≠ set из двух, когда они совпали.",
      }
    ],
  },
  {
    id: "greedy",
    title: "Жадность выглядит умно",
    module: "algo",
    minutes: 14,
    needsPandas: false,
    body: [
      "Канонические монеты (1,5,10,25) — жадность жива. На [1,3,4] для 6 она врёт.",
      "Если не доказал каноничность — пиши ДП.",
      "Jump game: жадность на максимальную досягаемость — ок. Всегда прыгай max — нет."
    ],
    tasks: [
      {
        id: "coins",
        title: "минимум монет, любые номиналы",
        prompt: "min_coins(amount, coins) — минимум монет, неограниченный запас. Невозможно → -1. amount>=0. Жадность не пройдёт тесты.",
        starter: "def min_coins(amount, coins):\n    ...\n",
        examples: [
          "min_coins(6, [1,3,4]) == 2",
          "min_coins(3, [2]) == -1"
        ],
        tests: "\nassert min_coins(6, [1, 3, 4]) == 2\nassert min_coins(3, [2]) == -1\nassert min_coins(0, [1, 2]) == 0\nassert min_coins(11, [1, 5, 10]) == 2\nassert min_coins(7, [5, 3]) == 2\n",
        hint: "ДП dp[x] = min(dp[x-c]+1). Инициализация inf, dp[0]=0. Не сортируй монеты и не вычитай с конца.",
        debrief: "Ловушка: жадность 4+1+1 для шести при номиналах 1,3,4. Оптимум 3+3. Каноничность — теорема, не ощущение.",
      },
      {
        id: "jump",
        title: "допрыгать",
        prompt: "can_jump(nums) — каждый элемент: макс шаг вперёд. Старт 0. True, если можно последний индекс. Пустой список — False.",
        starter: "def can_jump(nums):\n    ...\n",
        examples: [
          "[2,3,1,1,4] True",
          "[3,2,1,0,4] False"
        ],
        tests: "\nassert can_jump([2, 3, 1, 1, 4]) is True\nassert can_jump([3, 2, 1, 0, 4]) is False\nassert can_jump([0]) is True\nassert can_jump([]) is False\nassert can_jump([1, 0, 0]) is False\nassert can_jump([2, 0, 0]) is True\n",
        hint: "Держи reach. Идёшь слева, пока i <= reach.",
        debrief: "Ловушка: всегда прыгать на nums[i]. Нужен максимум досягаемости, не один ход.",
      }
    ],
  },
];

export const lessonById: Record<string, Lesson> = Object.fromEntries(
  lessons.map((l) => [l.id, l]),
);

export function allTaskKeys() {
  const keys: string[] = [];
  for (const l of lessons) {
    for (const t of l.tasks) keys.push(`${l.id}::${t.id}`);
  }
  return keys;
}
