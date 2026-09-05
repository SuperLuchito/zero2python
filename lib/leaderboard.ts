import { allTaskKeys } from "../content/curriculum";
import { bookParts, quizScore } from "../content/book";
import { counts, type Progress } from "./progress";
import { lessonDone, orderedLessons } from "./access";
export type LeaderboardRow = {
  id: string;
  name: string;
  solved: number;
  lessons: number;
  read: number | null;
  quizCorrect: number | null;
  quizTotal: number | null;
  rank: number;
};
export function rankMembers(
  members: { id: string; name: string; progress: Progress }[],
): LeaderboardRow[] {
  // ponytail: a full-team scan is sufficient for this small team; paginate if it grows.
  const rows = members
    .map((member) => {
      const tested = bookParts.filter(
        (part) => member.progress.book.tests[part.id],
      );
      return {
        id: member.id,
        name: member.name,
        solved: counts(member.progress.tasks, allTaskKeys()).done,
        lessons: orderedLessons.filter((l) => lessonDone(l.id, member.progress))
          .length,
        read: bookParts.length
          ? bookParts.filter(
              (part) => member.progress.book.read[part.id]?.value,
            ).length
          : null,
        quizCorrect: tested.length
          ? tested.reduce(
              (sum, part) =>
                sum +
                quizScore(part, member.progress.book.tests[part.id].answers),
              0,
            )
          : null,
        quizTotal: tested.length
          ? tested.reduce((sum, part) => sum + part.questions.length, 0)
          : null,
        rank: 0,
      };
    })
    .sort(
      (a, b) =>
        b.solved - a.solved ||
        a.name.localeCompare(b.name, "ru") ||
        a.id.localeCompare(b.id),
    );
  rows.forEach(
    (row, i) =>
      (row.rank =
        i > 0 && row.solved === rows[i - 1].solved ? rows[i - 1].rank : i + 1),
  );
  return rows;
}
