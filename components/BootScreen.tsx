"use client";
import Link from "next/link";
import { useEffect,useState } from "react";
import { Logo } from "./Logo";
const lines=["$ connect zero2python", "✓ Рабочее пространство готово", "Python / данные / алгоритмы"];
export function BootScreen() {
  const [step,setStep]=useState(0);
  useEffect(()=>{ if(window.matchMedia("(prefers-reduced-motion: reduce)").matches) { setStep(lines.length); return; } if(step>=lines.length)return; const timer=setTimeout(()=>setStep(n=>n+1),350); return ()=>clearTimeout(timer); },[step]);
  return <main className="terminal-entry"><section className="entry-window" aria-label="Терминал Zero to Python"><header><Logo/><span>zero2python / workspace</span><span className="window-dots" aria-hidden="true"><i/><i/><i/></span></header><div className="entry-content"><div className="entry-lines">{lines.map((line,i)=><p key={line} className={i<step ? "visible" : ""} aria-hidden={i>=step}>{line}</p>)}</div><div className="entry-command"><span aria-hidden="true">❯</span><span>open learning</span><span className="cursor"/></div><Link href="/app" className="entry-go">Войти в рабочее пространство <span>↵</span></Link></div><footer><span>Локальная сессия</span><span>UTF-8 · Python</span></footer></section></main>;
}
