import { notFound } from "next/navigation";
import { LessonView } from "@/components/LessonView";
import { lessonById, lessons } from "@/content/curriculum";

export function generateStaticParams() {
  return lessons.map((l) => ({ id: l.id }));
}

export default async function LessonPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const lesson = lessonById[id];
  if (!lesson) notFound();
  return <LessonView key={lesson.id} lesson={lesson} />;
}
