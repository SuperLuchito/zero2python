import { cookies } from "next/headers";
import {
  authenticate,
  db,
  hash,
  publicMember,
  sessionMember,
  teamConfigured,
} from "@/lib/server/team";
import { body, checkOrigin, COOKIE, failure, json } from "@/lib/server/http";
import { normalizeProgress } from "@/lib/progress";
export const runtime = "nodejs";
export async function GET() {
  try {
    const member = sessionMember((await cookies()).get(COOKIE)?.value);
    return json({
      user: member ? publicMember(member) : null,
      progress: member ? normalizeProgress(JSON.parse(member.progress)) : null,
      configured: teamConfigured(),
    });
  } catch (e) {
    return failure(e);
  }
}
export async function POST(request: Request) {
  try {
    const { token, member } = await authenticate(await body(request));
    (await cookies()).set(COOKIE, token, {
      httpOnly: true,
      sameSite: "strict",
      secure:
        new URL(process.env.APP_ORIGIN || request.url).protocol === "https:",
      path: "/",
      maxAge: 30 * 86400,
    });
    return json({
      user: publicMember(member),
      progress: normalizeProgress(JSON.parse(member.progress)),
    });
  } catch (e) {
    return failure(e);
  }
}
export async function DELETE(request: Request) {
  try {
    checkOrigin(request);
    const jar = await cookies(),
      token = jar.get(COOKIE)?.value;
    if (token)
      db().prepare("DELETE FROM sessions WHERE token = ?").run(hash(token));
    jar.delete(COOKIE);
    return json({ ok: true });
  } catch (e) {
    return failure(e);
  }
}
