import type { Qotd } from "@/lib/types";

export const qotdPool: Qotd[] = [
  {
    id: "late-lambda",
    title: "Поздняя ячейка",
    prompt:
      "Что напечатает код?\n\nfuncs = []\nfor i in range(3):\n    funcs.append(lambda: i)\nprint([f() for f in funcs])",
    choices: ["[0, 1, 2]", "[2, 2, 2]", "[3, 3, 3]", "TypeError"],
    answer: 1,
    trap: "late binding: все лямбды читают одно i, к вызову оно 2.",
    debrief:
      "Цикл не копирует i в тело. К моменту print цикл кончился, i=2. Фикс: lambda i=i: i или def factory(i): return lambda: i.",
  },
  {
    id: "mutable-default",
    title: "Дефолт живёт дольше тебя",
    prompt:
      "def add(x, box=[]):\n    box.append(x)\n    return box\nprint(add(1), add(2))",
    choices: [
      "[1] [2]",
      "[1] [1, 2]",
      "[1, 2] [1, 2]",
      "TypeError",
    ],
    answer: 2,
    trap: "мутабельный default создаётся один раз, на определении функции.",
    debrief:
      "Оба вызова пишут в один и тот же list. print печатает один объект дважды — уже [1,2] [1,2]. None + создание внутри — ритуал не просто так.",
  },
  {
    id: "is-intern",
    title: "is не сравнение",
    prompt:
      "Что верно в CPython для этого фрагмента?\n\na = 256\nb = 256\nc = 257\nd = 257\nprint(a is b, c is d)  # оба литерала, один кадр",
    choices: [
      "True True всегда по языку",
      "True True в CPython на литералах в одном модуле — часто, но is всё равно не про равенство",
      "False False",
      "True False гарантировано спецификацией",
    ],
    answer: 1,
    trap: "интернирование маленьких int. Это деталь рантайма, не контракт.",
    debrief:
      "256 интернируют. 257 — как повезёт (в одном файле компилятор может сложить в один объект). == для чисел, is для идентичности. Тест на is с int — ловушка для собеса, не для кода.",
  },
  {
    id: "shared-row",
    title: "Одна строка на всех",
    prompt:
      "g = [[0] * 2] * 2\ng[0][0] = 1\nprint(g)",
    choices: ["[[1, 0], [0, 0]]", "[[1, 0], [1, 0]]", "[[1, 1], [1, 1]]", "IndexError"],
    answer: 1,
    trap: "внешнее * копирует ссылки, не ряды.",
    debrief:
      "Два ряда — один list. Внутреннее [0]*2 безопасно: нули иммутабельны. Внешнее * — нет. Нужен comprehension.",
  },
  {
    id: "true-key",
    title: "True как единица",
    prompt:
      "d = {}\nd[True] = 'a'\nd[1] = 'b'\nd[1.0] = 'c'\nprint(len(d), d[True])",
    choices: ["3 a", "3 c", "1 c", "2 b"],
    answer: 2,
    trap: "True == 1 == 1.0 и хеш совпадает. Один ключ.",
    debrief:
      "В dict ключи сравниваются по равенству и хешу. bool — подкласс int. Три записи, одна дырка, значение последнее: 'c'.",
  },
  {
    id: "pandas-add",
    title: "Сложение не по местам",
    prompt:
      "Две Series длины 2: a с индексом [0,1], b с индексом [1,2], значения [1,2] и [10,20]. Что делает a + b (pandas)?",
    choices: [
      "Series [11, 22] по позиции",
      "индекс 0,1,2: NaN, 12, NaN",
      "ValueError: align",
      "индекс 1: 12, остальное отброшено",
    ],
    answer: 1,
    trap: "выравнивание по индексу, не по позиции. Дырки — NaN, не 0.",
    debrief:
      "union индексов: 0 только в a, 1 в обоих (2+10), 2 только в b. Без fill_value — NaN. values+values — другая операция, и ты уже не в pandas.",
  },
  {
    id: "chained-cmp",
    title: "Цепочка сравнений",
    prompt:
      "Что печатает print(False == False in [False]) ?",
    choices: ["False", "True", "TypeError", "SyntaxError"],
    answer: 1,
    trap: "a == b in c это (a == b) and (b in c), не (a == b) in c.",
    debrief:
      "False == False → True, и False in [False] → True. Цепочка как в 1 < x < 2. Скобки спасают, интуиция — нет.",
  },
  {
    id: "iter-insert",
    title: "Вставка во время обхода",
    prompt:
      "d = {1: 1}\nfor k in d:\n    d[k + 1] = k\n# конечный ключ-сет, CPython 3.10+",
    choices: [
      "стабильно {1,2} и выход",
      "RuntimeError: dictionary changed size during iteration",
      "бесконечный цикл гарантирован языком",
      "KeyError",
    ],
    answer: 1,
    trap: "менять размер dict на итерации нельзя. Не «допишешь один ключ и сойдёт».",
    debrief:
      "Итератор словаря падает, если размер изменился. list(d) сначала — другой контракт. Не путай с list, который молча пропускает элементы.",
  },
  {
    id: "for-target-index",
    title: "Цель цикла — ячейка списка",
    prompt:
      "a = [1, 2, 3]\nfor a[-1] in a:\n    pass\nprint(a)",
    choices: [
      "[1, 2, 3]",
      "[1, 2, 2]",
      "[3, 3, 3]",
      "SyntaxError",
    ],
    answer: 1,
    trap: "for пишет в цель на каждой итерации. Цель — a[-1], живая ячейка.",
    debrief:
      "Итерация 1: a[-1]=1 → [1,2,1]. Итерация 2: a[-1]=2 → [1,2,2]. Итерация 3 читает уже 2 и пишет 2. Не «обход копии».",
  },
];

export function qotdForDate(d: Date): Qotd {
  const start = Date.UTC(d.getFullYear(), 0, 0);
  const day = Math.floor((Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) - start) / 86400000);
  const idx = day % qotdPool.length;
  return qotdPool[idx]!;
}

export function dayKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}
