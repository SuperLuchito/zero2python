"""Авторские решения и проверка рукописи, не код проверки ученика в UI.

Запуск из корня: python3 docs/curriculum/author-solutions.py
Python 3.12, только стандартная библиотека. Не запускать с -O: нужны assert.
"""

import contextlib
import io
import itertools
import math
import re


# Для скриптов хранится только вычислительная часть после исходных данных.
# В каркасе приложения входные присваивания находятся в starter ученика;
# автоматическую подстановку вариантов при интеграции нужно адаптировать.
SCRIPT_TASKS = {
    "L01-T01": (
        "before = queued\nqueued = queued - batch\nprocessed = processed + batch",
        [
            ({"queued": 12, "processed": 3, "batch": 5}, {"before": 12, "queued": 7, "processed": 8}),
            ({"queued": 0, "processed": 3, "batch": 0}, {"before": 0, "queued": 0, "processed": 3}),
            ({"queued": 5, "processed": 0, "batch": 5}, {"before": 5, "queued": 0, "processed": 5}),
        ],
    ),
    "L01-T02": (
        "corrected = (raw - offset) * gain",
        [
            ({"raw": 17, "offset": 5, "gain": 3}, {"corrected": 36}),
            ({"raw": 5, "offset": 5, "gain": 9}, {"corrected": 0}),
            ({"raw": -2, "offset": 3, "gain": 2}, {"corrected": -10}),
            ({"raw": 8, "offset": -2, "gain": 0}, {"corrected": 0}),
        ],
    ),
    "L01-T03": (
        "saved = front\nfront = back\nback = saved",
        [
            ({"front": "cam-a", "back": "cam-b"}, {"front": "cam-b", "back": "cam-a"}),
            ({"front": "same", "back": "same"}, {"front": "same", "back": "same"}),
            ({"front": "", "back": "cam-b"}, {"front": "cam-b", "back": ""}),
        ],
    ),
    "L01-T04": (
        "elapsed = finished - started\nold_elapsed = elapsed\nfinished = new_finished\nelapsed = finished - started",
        [
            ({"started": 100, "finished": 118, "new_finished": 125}, {"old_elapsed": 18, "finished": 125, "elapsed": 25}),
            ({"started": 4, "finished": 4, "new_finished": 4}, {"old_elapsed": 0, "finished": 4, "elapsed": 0}),
            ({"started": -10, "finished": -5, "new_finished": 2}, {"old_elapsed": 5, "finished": 2, "elapsed": 12}),
        ],
    ),
    "L02-T01": (
        "full = frames // capacity\ntail = frames % capacity\npackages = (frames + capacity - 1) // capacity",
        [
            ({"frames": 47, "capacity": 8}, {"full": 5, "tail": 7, "packages": 6}),
            ({"frames": 48, "capacity": 8}, {"full": 6, "tail": 0, "packages": 6}),
            ({"frames": 0, "capacity": 8}, {"full": 0, "tail": 0, "packages": 0}),
            ({"frames": 1, "capacity": 8}, {"full": 0, "tail": 1, "packages": 1}),
            ({"frames": 7, "capacity": 1}, {"full": 7, "tail": 0, "packages": 7}),
        ],
    ),
    "L02-T02": (
        "position = (current + delta) % slots",
        [
            ({"slots": 8, "current": 1, "delta": -3}, {"position": 6}),
            ({"slots": 8, "current": 7, "delta": 2}, {"position": 1}),
            ({"slots": 1, "current": 0, "delta": -99}, {"position": 0}),
            ({"slots": 8, "current": 1, "delta": -27}, {"position": 6}),
            ({"slots": 8, "current": 7, "delta": 0}, {"position": 7}),
        ],
    ),
    "L02-T03": (
        "level = float(raw)\nscaled = level * 255\npixel = int(scaled)",
        [
            ({"raw": " 0.75 "}, {"level": 0.75, "scaled": 191.25, "pixel": 191}),
            ({"raw": "0"}, {"level": 0.0, "scaled": 0.0, "pixel": 0}),
            ({"raw": "1"}, {"level": 1.0, "scaled": 255.0, "pixel": 255}),
            ({"raw": "0.5"}, {"level": 0.5, "scaled": 127.5, "pixel": 127}),
            ({"raw": "0.1"}, {"level": 0.1, "scaled": 25.5, "pixel": 25}),
        ],
    ),
    "L02-T04": (
        "day = timestamp // 86400\nsecond = timestamp % 86400",
        [
            ({"timestamp": -1}, {"day": -1, "second": 86399}),
            ({"timestamp": 0}, {"day": 0, "second": 0}),
            ({"timestamp": 86400}, {"day": 1, "second": 0}),
            ({"timestamp": -86401}, {"day": -2, "second": 86399}),
            ({"timestamp": -86400}, {"day": -1, "second": 0}),
        ],
    ),
    "L03-T01": (
        "normalized = raw.strip().lower().replace('_', '-')",
        [
            ({"raw": " \tCam_A\r\n"}, {"raw": " \tCam_A\r\n", "normalized": "cam-a"}),
            ({"raw": " A__B "}, {"raw": " A__B ", "normalized": "a--b"}),
            ({"raw": " A B "}, {"raw": " A B ", "normalized": "a b"}),
            ({"raw": ""}, {"raw": "", "normalized": ""}),
        ],
    ),
    "L03-T02": (
        "stem = filename[:-4]",
        [
            ({"filename": "exp.csv.backup.csv"}, {"stem": "exp.csv.backup"}),
            ({"filename": "sc.csv"}, {"stem": "sc"}),
            ({"filename": ".csv"}, {"stem": ""}),
        ],
    ),
    "L03-T03": (
        "masked = badge[:2] + '*' * (len(badge) - 4) + badge[-2:]",
        [
            ({"badge": "AB12CD"}, {"masked": "AB**CD"}),
            ({"badge": "ABCD"}, {"masked": "ABCD"}),
            ({"badge": "ABCDE"}, {"masked": "AB*DE"}),
            ({"badge": "A" * 30}, {"masked": "AA" + "*" * 26 + "AA"}),
        ],
    ),
    "L03-T04": (
        "camera = packet[:5].lower()\ncount = int(packet[6:9])\nstatus = packet[10:].lower()\nmessage = f'{camera}:{count}:{status}'",
        [
            ({"packet": "CAM07|023|OK"}, {"camera": "cam07", "count": 23, "status": "ok", "message": "cam07:23:ok"}),
            ({"packet": "CAM00|000|ER"}, {"camera": "cam00", "count": 0, "status": "er", "message": "cam00:0:er"}),
            ({"packet": "CAM99|999|AB"}, {"camera": "cam99", "count": 999, "status": "ab", "message": "cam99:999:ab"}),
        ],
    ),
    "L04-T01": (
        "if delay is None:\n    actual = fallback\nelse:\n    actual = delay",
        [
            ({"delay": 0, "fallback": 10}, {"actual": 0}),
            ({"delay": None, "fallback": 10}, {"actual": 10}),
            ({"delay": 7, "fallback": 10}, {"actual": 7}),
            ({"delay": None, "fallback": 0}, {"actual": 0}),
        ],
    ),
    "L04-T02": (
        "if not online:\n    status = 'offline'\nelif battery <= 10:\n    status = 'low-battery'\nelif temperature >= 80:\n    status = 'hot'\nelse:\n    status = 'ready'",
        [
            ({"online": False, "battery": 5, "temperature": 90}, {"status": "offline"}),
            ({"online": True, "battery": 10, "temperature": 80}, {"status": "low-battery"}),
            ({"online": True, "battery": 11, "temperature": 80}, {"status": "hot"}),
            ({"online": True, "battery": 11, "temperature": 79}, {"status": "ready"}),
            ({"online": False, "battery": 100, "temperature": -100}, {"status": "offline"}),
        ],
    ),
    "L04-T03": (
        "overlap = a_start < a_end and b_start < b_end and a_start < b_end and b_start < a_end",
        [
            ({"a_start": 10, "a_end": 20, "b_start": 20, "b_end": 30}, {"overlap": False}),
            ({"a_start": 10, "a_end": 21, "b_start": 20, "b_end": 30}, {"overlap": True}),
            ({"a_start": 10, "a_end": 30, "b_start": 20, "b_end": 20}, {"overlap": False}),
            ({"a_start": 10, "a_end": 30, "b_start": 15, "b_end": 25}, {"overlap": True}),
            ({"a_start": -5, "a_end": 0, "b_start": -3, "b_end": 2}, {"overlap": True}),
            ({"a_start": 2, "a_end": 2, "b_start": 0, "b_end": 5}, {"overlap": False}),
            ({"a_start": 5, "a_end": 8, "b_start": 0, "b_end": 4}, {"overlap": False}),
        ],
    ),
    "L04-T04": (
        "ready = total > 0 and done * 5 >= total * 4",
        [
            ({"done": 0, "total": 0}, {"ready": False}),
            ({"done": 4, "total": 5}, {"ready": True}),
            ({"done": 3, "total": 5}, {"ready": False}),
            ({"done": 1, "total": 1}, {"ready": True}),
            ({"done": 0, "total": 5}, {"ready": False}),
            ({"done": 799999, "total": 1000000}, {"ready": False}),
            ({"done": 800000, "total": 1000000}, {"ready": True}),
        ],
    ),
}


def normalize_sensor(text):
    return text.strip().lower().replace("_", "-")


def preview(text, limit):
    if len(text) <= limit:
        return text
    if limit <= 3:
        return "." * limit
    return text[:limit - 3] + "..."


def next_tick(now, period=5):
    return ((now + period - 1) // period) * period


def classify_reading(value, low, high):
    if value is None:
        return "missing"
    if value < low:
        return "below"
    if value > high:
        return "above"
    return "inside"


def count_unknown(commands):
    count = 0
    for symbol in commands:
        if symbol not in "LR.":
            count = count + 1
    return count


def longest_signal(signal):
    current = 0
    best = 0
    for symbol in signal:
        if symbol == "1":
            current = current + 1
            if current > best:
                best = current
        else:
            current = 0
    return best


def first_return(commands):
    position = 0
    for index in range(len(commands)):
        if commands[index] == "L":
            position = position - 1
        else:
            position = position + 1
        if position == 0:
            return index + 1
    return None


def compress_runs(text):
    if text == "":
        return ""
    result = ""
    previous = text[0]
    count = 0
    for symbol in text:
        if symbol == previous:
            count = count + 1
        else:
            result = result + previous + str(count)
            previous = symbol
            count = 1
    # ponytail: строковая сборка ограничена 1000 символами входа; для больших
    # потоков после изучения списков перейти к накоплению частей и join.
    return result + previous + str(count)


FUNCTION_TASKS = {
    "L05-T01": (normalize_sensor, [
        ((" CAM_A ",), "cam-a"), (("",), ""), (("A__B",), "a--b"),
        ((" A B ",), "a b"), (("\tCAM_A\r\n",), "cam-a"),
    ]),
    "L05-T02": (preview, [
        (("camera", 5), "ca..."), (("camera", 2), ".."),
        (("camera", 0), ""), (("cam", 3), "cam"), (("", 0), ""),
        (("ab", 2), "ab"), (("abc", 9), "abc"), (("camera", 3), "..."),
        (("камера", 4), "к..."),
    ]),
    "L05-T03": (next_tick, [
        ((12,), 15), ((15,), 15), ((0, 7), 0), ((13, 7), 14),
        ((1, 1), 1), ((10**30 + 1, 5), 10**30 + 5),
    ]),
    "L05-T04": (classify_reading, [
        ((None, 0, 10), "missing"), ((0, 0, 10), "inside"),
        ((10, 0, 10), "inside"), ((-1, 0, 10), "below"),
        ((11, 0, 10), "above"), ((5, 5, 5), "inside"),
        ((-5, -10, -1), "inside"),
    ]),
    "L06-T01": (count_unknown, [
        (("LR.XL",), 1), (("lr ",), 3), (("...",), 0), (("",), 0),
        (("L\nR",), 1), (("X" * 1000,), 1000),
    ]),
    "L06-T02": (longest_signal, [
        (("11011101",), 3), (("111",), 3), (("10101",), 1),
        (("000",), 0), (("",), 0), (("001111",), 4),
        (("1" * 1000,), 1000),
    ]),
    "L06-T03": (first_return, [
        (("LRRL",), 2), (("RRLL",), 4), (("RRR",), None),
        (("",), None), (("RL",), 2), (("L",), None),
        (("R" * 500 + "L" * 500,), 1000),
    ]),
    "L06-T04": (compress_runs, [
        (("aaabbcaa",), "a3b2c1a2"), (("a",), "a1"),
        (("ab",), "a1b1"), (("a" * 12,), "a12"), (("",), ""),
        (("aba",), "a1b1a1"), (("z" * 1000,), "z1000"),
    ]),
}


def check_value(actual, expected):
    # bool является подклассом int; одного == недостаточно для контракта типов.
    assert type(actual) is type(expected), (actual, expected, type(actual))
    if isinstance(expected, float):
        assert math.isclose(actual, expected, rel_tol=1e-12, abs_tol=1e-12)
    else:
        assert actual == expected, (actual, expected)


def check_script(source, cases):
    for inputs, expected in cases:
        namespace = dict(inputs)
        exec(source, namespace)
        for name, value in expected.items():
            assert name in namespace, name
            check_value(namespace[name], value)


def check_function(function, cases):
    for arguments, expected in cases:
        output = io.StringIO()
        with contextlib.redirect_stdout(output):
            actual = function(*arguments)
        assert output.getvalue() == "", "Функция должна возвращать, не печатать"
        check_value(actual, expected)


def check_properties():
    checks = 0
    for raw in ("", " CAM_A ", " a--b ", "A B", "\tCam__A\n"):
        once = normalize_sensor(raw)
        assert normalize_sensor(once) == once
        checks += 1
    for size in range(21):
        text = "x" * size
        for limit in range(25):
            result = preview(text, limit)
            assert len(result) <= limit
            if size <= limit:
                assert result == text
            else:
                assert len(result) == limit
            checks += 1
    for now in (*range(101), 10**30, 10**30 + 1):
        for period in range(1, 14):
            tick = next_tick(now, period)
            assert type(tick) is int and tick % period == 0
            assert now <= tick < now + period
            checks += 1
    for size in range(7):
        for symbols in itertools.product("01", repeat=size):
            signal = "".join(symbols)
            # Независимая проверка через разделение по разрывам.
            assert longest_signal(signal) == max(map(len, signal.split("0")))
            commands = signal.replace("0", "L").replace("1", "R")
            returns = [i for i in range(1, size + 1)
                       if commands[:i].count("L") == commands[:i].count("R")]
            assert first_return(commands) == (returns[0] if returns else None)
            original = signal.replace("0", "a").replace("1", "b")
            encoded = compress_runs(original)
            groups = re.findall(r"([a-z])([1-9][0-9]*)", encoded)
            assert "".join(letter + count for letter, count in groups) == encoded
            assert "".join(letter * int(count) for letter, count in groups) == original
            assert all(groups[i][0] != groups[i - 1][0] for i in range(1, len(groups)))
            checks += 3
    return checks


def check_rejected_mistakes():
    """Проверяем, что набор различает целевые ошибки и правильное поведение."""
    wrong_scripts = {
        "L01-T02": "corrected = raw * gain - offset",
        "L01-T03": "front = back\nback = front",
        "L02-T01": "full = frames // capacity\ntail = frames % capacity\npackages = full + 1",
        "L02-T03": "level = float(raw)\nscaled = level * 255\npixel = round(scaled)",
        "L02-T04": "day = int(timestamp / 86400)\nsecond = timestamp % 86400",
        "L03-T02": "stem = filename.strip('.csv')",
        "L04-T01": "actual = delay or fallback",
        "L04-T03": "overlap = a_start < b_end and b_start < a_end",
        "L04-T04": "ready = done * 5 >= total * 4",
    }
    wrong_functions = {
        "L05-T02": lambda text, limit: text[:limit] + "...",
        "L05-T03": lambda now, period=5: (now // period + 1) * period,
        "L05-T04": lambda value, low, high: "missing" if not value else classify_reading(value, low, high),
        "L06-T01": lambda commands: count_unknown(commands.upper().strip()),
        "L06-T02": lambda signal: signal.count("1"),
        "L06-T03": lambda commands: 0,
        "L06-T04": lambda text: "" if not text else text[0] + str(len(text)),
    }
    for task_id, source in wrong_scripts.items():
        try:
            check_script(source, SCRIPT_TASKS[task_id][1])
        except AssertionError:
            continue
        raise AssertionError(f"Проверки пропустили ошибку: {task_id}")
    for task_id, function in wrong_functions.items():
        try:
            check_function(function, FUNCTION_TASKS[task_id][1])
        except AssertionError:
            continue
        raise AssertionError(f"Проверки пропустили ошибку: {task_id}")
    return len(wrong_scripts) + len(wrong_functions)


def main():
    assert __debug__, "Запускайте без -O"
    for task_id, (source, cases) in SCRIPT_TASKS.items():
        check_script(source, cases)
        print(f"{task_id}: сценариев {len(cases)}, OK")
    for task_id, (function, cases) in FUNCTION_TASKS.items():
        check_function(function, cases)
        print(f"{task_id}: сценариев {len(cases)}, OK")
    properties = check_properties()
    mistakes = check_rejected_mistakes()
    scenarios = sum(len(cases) for _, cases in SCRIPT_TASKS.values())
    scenarios += sum(len(cases) for _, cases in FUNCTION_TASKS.values())
    print(f"Итого: 24 задачи, {scenarios} сценариев, {properties} проверок свойств; "
          f"{mistakes} ошибочных решений отклонено.")


if __name__ == "__main__":
    main()
