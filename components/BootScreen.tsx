import Link from "next/link";

export function BootScreen() {
  return <main className="welcome">
    <div className="welcome-meta"><span>zero2python</span><span>Учимся на практике</span></div>
    <div className="welcome-body">
      <div className="code-orbit" aria-hidden="true"><span>(</span><i>py</i><span>)</span><b /></div>
      <p className="eyebrow">PYTHON · ML · COMPUTER VISION</p>
      <h1>Большие идеи.<br /><em>С первой строки.</em></h1>
      <p>Разбирайтесь в теории, экспериментируйте с кодом<br />и превращайте знания в работающие решения.</p>
      <Link className="welcome-start" href="/app">Начать учиться <span>↗</span></Link>
    </div>
    <div className="welcome-meta"><span>Python прямо в браузере</span><span>В вашем темпе</span></div>
  </main>;
}
