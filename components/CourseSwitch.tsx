import Link from "next/link";
export function CourseSwitch({ university = false }: { university?: boolean }) {
  return (
    <nav className="section-switch" aria-label="Направление обучения">
      <Link href="/app" aria-current={!university ? "page" : undefined}>
        Python
      </Link>
      <Link
        href="/app/university"
        aria-current={university ? "page" : undefined}
      >
        Университетский курс
      </Link>
    </nav>
  );
}
