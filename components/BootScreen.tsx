"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { highlightPython } from "@/lib/highlight";
const steps = ["$ start zero2python", "✓ Среда для экспериментов готова", "→ Изучаем Python. Разбираемся в данных.", "→ От первых функций — к нейросетям и компьютерному зрению."];
export function BootScreen() {
  const [step, setStep] = useState(0);
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) { setStep(steps.length); return; }
    if (step >= steps.length) return;
    const timer = window.setTimeout(() => setStep(n => n + 1), 650);
    return () => clearInterval(timer);
  }, [step]);
  return <main className="terminal-intro">
    <header className="intro-nav"><Link href="/" className="intro-brand">z₂ <span>zero2python</span></Link><span>Место, где идеи становятся кодом</span></header>
    <div className="intro-grid"><section className="intro-copy"><p className="eyebrow">ОТ НУЛЯ — К ПОНИМАНИЮ</p><h1>Всё начинается<br />с <em>одной строки.</em></h1><p>Учимся понимать Python, исследовать данные и создавать своё. Вместе, шаг за шагом — через небольшие открытия и настоящую практику.</p><Link className="welcome-start" href="/app">Открыть моё обучение <span>↗</span></Link><div className="intro-tags"><span>01 / Разобраться</span><span>02 / Попробовать</span><span>03 / Создать</span></div></section>
    <section className="intro-terminal" aria-label="Знакомство с платформой"><header><span className="window-dots" aria-hidden="true"><i/><i/><i/></span><span>zero2python — начало пути</span><span>⌘</span></header><div className="terminal-session"><div className="terminal-lines">{steps.map((line,i)=><p key={line} className={i < step ? "revealed" : ""} aria-hidden={i >= step}>{line}</p>)}</div><div className="terminal-demo"><span className="terminal-file">first_step.py</span><pre><code dangerouslySetInnerHTML={{__html:highlightPython('def learn(idea):\n    experiment = idea + " + практика"\n    return experiment\n\nprint(learn("А что, если?"))')}}/></pre><div className="terminal-answer"><span>↳</span> А что, если? + практика<span className="cursor"/></div></div></div><footer><span><i className="runtime-dot"/> Python в браузере</span><span>Можно начинать</span></footer></section></div>
    <footer className="intro-bottom"><span>Теория → эксперимент → понимание</span><span>Python · Анализ данных · Нейросети</span></footer>
  </main>;
}
