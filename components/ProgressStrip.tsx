"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { allTaskKeys } from "@/content/curriculum";
import { counts } from "@/lib/progress";
import { useProgress } from "./ProgressProvider";
export function ProgressStrip() {
  const path = usePathname(),
    { progress, ready } = useProgress();
  const c = counts(progress.tasks, allTaskKeys());
  const links = [
    {
      href: "/app",
      label: "Карта",
      active:
        path === "/app" ||
        path.startsWith("/app/lesson") ||
        path.startsWith("/app/university"),
    },
    { href: "/app/qotd", label: "Вопрос дня", active: path === "/app/qotd" },
    { href: "/app/book", label: "Книга", active: path.startsWith("/app/book") },
    {
      href: "/app/progress",
      label: "Прогресс",
      active: path.startsWith("/app/progress"),
    },
  ];
  return (
    <>
      <a className="skip-link" href="#main-content">
        К содержимому
      </a>
      <header className="topbar">
        <nav className="strip" aria-label="Основная навигация">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              aria-current={link.active ? "page" : undefined}
            >
              {link.label}
            </Link>
          ))}
        </nav>
        <div className="strip-progress">
          <span>
            Python · {ready ? `${c.done}/${c.total} задач` : "загрузка…"}
          </span>
          <span className="bar" aria-hidden="true">
            <i
              style={{ width: `${c.total ? (c.done / c.total) * 100 : 0}%` }}
            />
          </span>
        </div>
      </header>
    </>
  );
}
