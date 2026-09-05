"use client";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import {
  emptyProgress,
  mergeProgress,
  normalizeProgress,
  type Progress,
} from "@/lib/progress";
import {
  getActiveKey,
  getProgress,
  getStorageError,
  GUEST_KEY,
  readProgress,
  saveProgress,
  selectProgress,
} from "@/lib/storage";

type User = { id: string; name: string };
type Account = {
  user: User | null;
  progress: Progress | null;
  configured?: boolean;
};
export async function api<T>(path: string, init?: RequestInit): Promise<T> {
  let response: Response;
  try {
    response = await fetch(path, {
      ...init,
      cache: "no-store",
      signal: AbortSignal.timeout(12000),
      headers: { "Content-Type": "application/json", ...init?.headers },
    });
  } catch {
    throw new Error(
      "Нет связи с сервером. Проверьте сеть и повторите попытку.",
    );
  }
  let data;
  try {
    data = await response.json();
  } catch {
    throw new Error("Сервер вернул некорректный ответ. Повторите попытку.");
  }
  if (!response.ok)
    throw new Error(data.error || "Не удалось связаться с сервером.");
  return data;
}
type Context = {
  progress: Progress;
  ready: boolean;
  user: User | null;
  configured: boolean;
  error: string;
  storageError: string;
  syncing: boolean;
  refresh: () => Promise<void>;
  connect: (input: Record<string, string>) => Promise<void>;
  disconnect: () => Promise<void>;
  importGuest: () => void;
};
const ProgressContext = createContext<Context | null>(null);
export const useProgress = () => {
  const value = useContext(ProgressContext);
  if (!value) throw new Error("ProgressProvider is missing");
  return value;
};
export function ProgressProvider({ children }: { children: React.ReactNode }) {
  const [progress, setProgress] = useState(emptyProgress);
  const [ready, setReady] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [configured, setConfigured] = useState(false);
  const [error, setError] = useState("");
  const [storageError, setStorageError] = useState("");
  const [syncing, setSyncing] = useState(false);
  const userRef = useRef<User | null>(null),
    pending = useRef(false),
    active = useRef(false);
  const sessionRequest = useRef(0);

  const sync = useCallback(async () => {
    pending.current = true;
    if (active.current || !userRef.current) return;
    active.current = true;
    setSyncing(true);
    try {
      while (pending.current && userRef.current) {
        pending.current = false;
        const id: string = userRef.current.id;
        const key = getActiveKey();
        const result = await api<{ progress: Progress }>("/api/team/progress", {
          method: "PUT",
          body: JSON.stringify({ userId: id, progress: getProgress() }),
        });
        if (key === getActiveKey() && id === userRef.current?.id) {
          const merged = mergeProgress(
            normalizeProgress(result.progress),
            getProgress(),
          );
          saveProgress(merged, false);
          setProgress(merged);
          setStorageError(getStorageError());
          setError("");
        }
      }
    } catch (e) {
      setError(
        (e as Error).message +
          " Локальная копия сохранена; повторите синхронизацию.",
      );
    } finally {
      active.current = false;
      setSyncing(false);
    }
  }, []);

  const applyAccount = useCallback((account: Account) => {
    userRef.current = account.user;
    setUser(account.user);
    if (account.configured !== undefined) setConfigured(account.configured);
    const key = account.user ? `py-term.user.${account.user.id}` : GUEST_KEY;
    const local = key === getActiveKey() ? getProgress() : readProgress(key);
    const merged = account.progress
      ? mergeProgress(normalizeProgress(account.progress), local)
      : local;
    selectProgress(key, merged);
    saveProgress(merged, false);
    setProgress(merged);
    setStorageError(getStorageError());
    setReady(true);
  }, []);
  const refresh = useCallback(async () => {
    const request = ++sessionRequest.current;
    try {
      const result = await api<Account>("/api/team/auth");
      if (request !== sessionRequest.current) return;
      setError("");
      applyAccount(result);
      if (result.user) void sync();
    } catch (e) {
      if (request !== sessionRequest.current) return;
      setError((e as Error).message);
      setProgress(getProgress());
      setStorageError(getStorageError());
      setReady(true);
    }
  }, [applyAccount, sync]);
  useEffect(() => {
    const changed = () => {
      setProgress(getProgress());
      setStorageError(getStorageError());
      if (userRef.current) void sync();
    };
    const stored = (event: StorageEvent) => {
      if (event.key === "py-term-session-changed") {
        void refresh();
        return;
      }
      if (event.key === getActiveKey()) {
        try {
          // Use this event's snapshot: a later tab may already have replaced localStorage.
          const incoming = normalizeProgress(
            JSON.parse(event.newValue || "{}"),
          );
          const merged = mergeProgress(getProgress(), incoming);
          saveProgress(merged, false);
          selectProgress(getActiveKey(), merged);
        } catch {
          setStorageError("Не удалось прочитать прогресс другой вкладки.");
        }
      }
    };
    const focused = () => {
      void refresh();
    };
    window.addEventListener("py-term-progress", changed);
    window.addEventListener("storage", stored);
    window.addEventListener("focus", focused);
    window.addEventListener("online", focused);
    void refresh();
    return () => {
      sessionRequest.current++;
      window.removeEventListener("py-term-progress", changed);
      window.removeEventListener("storage", stored);
      window.removeEventListener("focus", focused);
      window.removeEventListener("online", focused);
    };
  }, [refresh, sync]);
  const broadcast = () => {
    try {
      localStorage.setItem("py-term-session-changed", String(Date.now()));
    } catch {
      /* Storage errors are surfaced by saveProgress. */
    }
  };
  async function connect(input: Record<string, string>) {
    sessionRequest.current++;
    const result = await api<Account>("/api/team/auth", {
      method: "POST",
      body: JSON.stringify(input),
    });
    applyAccount(result);
    setError("");
    broadcast();
    void sync();
  }
  async function disconnect() {
    sessionRequest.current++;
    await api("/api/team/auth", { method: "DELETE" });
    applyAccount({ user: null, progress: null });
    setError("");
    broadcast();
  }
  return (
    <ProgressContext.Provider
      value={{
        progress,
        ready,
        user,
        configured,
        error,
        storageError,
        syncing,
        refresh,
        connect,
        disconnect,
        importGuest: () =>
          saveProgress(mergeProgress(getProgress(), readProgress(GUEST_KEY))),
      }}
    >
      {children}
      {storageError && (
        <div className="storage-alert" role="alert">
          {storageError}{" "}
          <button
            onClick={() => {
              saveProgress(getProgress());
              setStorageError(getStorageError());
            }}
          >
            Повторить сохранение
          </button>
        </div>
      )}
    </ProgressContext.Provider>
  );
}
