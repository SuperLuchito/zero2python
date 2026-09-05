"use client";

const INDEX = "https://cdn.jsdelivr.net/pyodide/v0.26.4/full/";

type Pyodide = {
  loadPackage: (names: string[]) => Promise<unknown>;
  runPythonAsync: (code: string) => Promise<unknown>;
  globals: { set: (k: string, v: unknown) => void; get: (k: string) => unknown };
};

declare global {
  interface Window {
    loadPyodide?: (opts: { indexURL: string }) => Promise<Pyodide>;
  }
}

let py: Pyodide | null = null;
let pandasReady = false;
let loading: Promise<Pyodide> | null = null;

function script(): Promise<void> {
  if (window.loadPyodide) return Promise.resolve();
  return new Promise((resolve, reject) => {
    const el = document.createElement("script");
    el.src = INDEX + "pyodide.js";
    el.onload = () => resolve();
    el.onerror = () => reject(new Error("Pyodide script failed"));
    document.head.appendChild(el);
  });
}

export async function bootPython(
  needPandas: boolean,
  line: (s: string) => void,
): Promise<void> {
  if (!py) {
    if (!loading) {
      loading = (async () => {
        line("> загрузка runtime python…");
        await script();
        if (!window.loadPyodide) throw new Error("loadPyodide missing");
        line("> монтирование wasm…");
        const inst = await window.loadPyodide({ indexURL: INDEX });
        line("> интерпретатор готов.");
        return inst;
      })();
    }
    py = await loading;
  }
  if (needPandas && !pandasReady) {
    line("> pandas не в hot path. тяну numpy/pandas через micropip…");
    await py.loadPackage(["micropip", "numpy", "pandas"]);
    pandasReady = true;
    line("> pandas в памяти.");
  }
}

export type RunResult = {
  ok: boolean;
  stdout: string;
  error: string;
};

const HARNESS = `
import sys, io, traceback
_buf = io.StringIO()
_err = ""
_ok = False
_old = sys.stdout
sys.stdout = _buf
try:
    _ns = {"__name__": "__main__"}
    exec(USER_SRC, _ns)
    exec(TEST_SRC, _ns)
    _ok = True
except Exception:
    _err = traceback.format_exc()
    _ok = False
finally:
    sys.stdout = _old
STDOUT = _buf.getvalue()
OK = _ok
ERR = _err
`;

export async function runTests(user: string, tests: string): Promise<RunResult> {
  if (!py) throw new Error("python not booted");
  py.globals.set("USER_SRC", user);
  py.globals.set("TEST_SRC", tests);
  await py.runPythonAsync(HARNESS);
  const ok = Boolean(py.globals.get("OK"));
  const stdout = String(py.globals.get("STDOUT") ?? "");
  const error = String(py.globals.get("ERR") ?? "");
  return { ok, stdout, error };
}

export async function runOpen(user: string): Promise<RunResult> {
  return runTests(user, "pass");
}
