import { body, failure, json, requireMember } from "@/lib/server/http";
import { HttpError, syncProgress } from "@/lib/server/team";
export const runtime = "nodejs";
export async function PUT(request: Request) {
  try {
    const member = await requireMember(),
      input = await body(request);
    if (input.userId !== member.id)
      throw new HttpError(
        409,
        "Участник изменился в другой вкладке. Обновите страницу.",
      );
    return json({ progress: syncProgress(member, input.progress) });
  } catch (e) {
    return failure(e);
  }
}
