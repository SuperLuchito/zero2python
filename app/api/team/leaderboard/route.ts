import { failure, json, requireMember } from "@/lib/server/http";
import { canonicalProgress, db, type Member } from "@/lib/server/team";
import { rankMembers } from "@/lib/leaderboard";
export const runtime = "nodejs";
export async function GET() {
  try {
    const member = await requireMember();
    const members = db()
      .prepare("SELECT id, name, progress FROM members")
      .all() as Member[];
    return json({
      userId: member.id,
      rows: rankMembers(
        members.map((m) => ({
          ...m,
          progress: canonicalProgress(JSON.parse(m.progress)),
        })),
      ),
    });
  } catch (e) {
    return failure(e);
  }
}
