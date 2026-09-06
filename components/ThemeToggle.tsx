"use client";
import { useEffect, useState } from "react";
export function ThemeToggle() {
  const [light,setLight]=useState(false);
  useEffect(()=>setLight(document.documentElement.dataset.theme === "light"),[]);
  function toggle() { const next=!light; setLight(next); document.documentElement.dataset.theme=next ? "light" : "dark"; try { localStorage.setItem("z2p-theme",next ? "light" : "dark"); } catch {} }
  return <button className="theme-toggle" onClick={toggle} aria-label={light ? "Включить тёмную тему" : "Включить светлую тему"} title={light ? "Тёмная тема" : "Светлая тема"}><span aria-hidden="true">{light ? "☾" : "◐"}</span><span className="theme-label">Тема</span></button>;
}
