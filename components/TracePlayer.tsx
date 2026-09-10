"use client";
import { useEffect, useRef, useState } from 'react';
import { highlightPython } from '@/lib/highlight';
import type { TraceStep } from '@/lib/pyodide';
export function CodeFrame({code,line}:{code:string;line?:number}) {
 const pre=useRef<HTMLPreElement>(null);
 useEffect(()=>{const el=pre.current,active=el?.querySelector<HTMLElement>('.trace-active');if(el&&active){const top=active.offsetTop-el.offsetTop;if(top<el.scrollTop||top+active.offsetHeight>el.scrollTop+el.clientHeight)el.scrollTop=Math.max(0,top-el.clientHeight/2);}},[line]);
 return <div className="code-frame"><header><span>⌘ solution.py</span><span>Python</span></header><pre ref={pre}>{code.split('\n').map((text,i)=><div key={i} className={line===i+1?'trace-active':''}><span className="code-number">{i+1}</span><code dangerouslySetInnerHTML={{__html:highlightPython(text)||' '}}/></div>)}</pre></div>;
}
export function TracePlayer({code,steps,truncated}:{code:string;steps:TraceStep[];truncated?:boolean}) {
 const [index,setIndex]=useState(0),[playing,setPlaying]=useState(false);
 useEffect(()=>{if(!playing)return;const timer=setInterval(()=>setIndex(i=>{if(i>=steps.length-1){setPlaying(false);return i;}return i+1;}),900);return()=>clearInterval(timer);},[playing,steps.length]);
 if(!steps.length)return null;
 const step=steps[index],prev=steps[index-1];
 return <details className="trace-player" open><summary>Пошаговое выполнение · {steps.length} шагов</summary><div className="trace-controls"><button aria-label={playing?'Пауза':'Воспроизвести выполнение'} onClick={()=>{if(index===steps.length-1)setIndex(0);setPlaying(!playing);}}>{playing?'Ⅱ Пауза':'▷ Смотреть'}</button><button aria-label="Предыдущий шаг" disabled={!index} onClick={()=>{setPlaying(false);setIndex(index-1);}}>←</button><button aria-label="Следующий шаг" disabled={index===steps.length-1} onClick={()=>{setPlaying(false);setIndex(index+1);}}>→</button><span>{index+1} / {steps.length}</span><input aria-label="Шаг выполнения" type="range" min={0} max={steps.length-1} value={index} onChange={e=>{setPlaying(false);setIndex(Number(e.target.value));}}/></div><p className="trace-caption">{step.phase==='checks'?'Вызов вашей функции из проверки':'Запуск программы'} · {step.scope==='&lt;module&gt;'||step.scope==='<module>'?'основной код':step.scope} · {step.event==='exception'?'ошибка на строке':'состояние после строки'} {step.line}</p><CodeFrame code={code} line={step.line}/><div className="trace-variables"><h4>Переменные</h4>{Object.keys(step.variables).length?<dl>{Object.entries(step.variables).map(([name,value])=><div className={prev?.scope===step.scope&&prev.variables[name]===value?'':'value-changed'} key={name}><dt>{name}</dt><dd>{value}</dd></div>)}</dl>:<p>Переменные ещё не созданы.</p>}</div>{step.stdout&&<pre className="trace-output">{step.stdout}</pre>}{truncated&&<p className="dim">Показаны первые 200 шагов. Программа продолжила выполнение; длинные значения сокращены.</p>}</details>;
}
