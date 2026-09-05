import { cookies } from "next/headers";
import { HttpError, sessionMember } from "./team";
export const COOKIE = "zero2python-session";
export const json = (value: unknown, status = 200) =>
  Response.json(value, { status, headers: { "Cache-Control": "no-store" } });
export function failure(error: unknown) {
  if (error instanceof HttpError)
    return json({ error: error.message }, error.status);
  console.error(
    "Team API failure:",
    error instanceof Error ? error.message : "Unknown error",
  );
  return json(
    {
      error:
        "Сервер не смог сохранить или загрузить данные. Повторите попытку.",
    },
    500,
  );
}
export async function requireMember() {
  const member = sessionMember((await cookies()).get(COOKIE)?.value);
  if (!member)
    throw new HttpError(
      401,
      "Войдите в команду, чтобы открыть общие результаты.",
    );
  return member;
}
export function checkOrigin(request: Request) {
  const url = new URL(request.url);
  // Next may normalize request.url to localhost; Host retains the browser-facing address.
  const expected =
    process.env.APP_ORIGIN ||
    `${url.protocol}//${request.headers.get("host") || url.host}`;
  if (request.headers.get("origin") !== expected)
    throw new HttpError(
      403,
      "Источник запроса не подтвержден. Обновите страницу.",
    );
}
export async function body(request: Request): Promise<Record<string, unknown>> {
  checkOrigin(request);
  if (!request.headers.get("content-type")?.startsWith("application/json"))
    throw new HttpError(415, "Ожидается JSON.");
  const reader = request.body?.getReader();
  if (!reader) throw new HttpError(400, "Пустой запрос.");
  const chunks: Uint8Array[] = [];
  let size = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.length;
    if (size > 65536) {
      await reader.cancel();
      throw new HttpError(413, "Слишком большой запрос.");
    }
    chunks.push(value);
  }
  try {
    const data = JSON.parse(Buffer.concat(chunks).toString("utf8"));
    if (!data || typeof data !== "object" || Array.isArray(data))
      throw new Error();
    return data;
  } catch {
    throw new HttpError(400, "Некорректный JSON.");
  }
}
