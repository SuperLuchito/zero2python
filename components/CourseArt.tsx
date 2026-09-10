import type { ReactNode } from 'react';

/** One illustration per module; geometry follows its subject. */
export function CourseArt({ index }: { index: number }) {
 const box=(x:number,y:number,w:number,h:number,label:string)=> <g><rect x={x} y={y} width={w} height={h} rx="9"/><text x={x+w/2} y={y+h/2+8} textAnchor="middle" stroke="none" fill="currentColor" fontSize="24" fontFamily="monospace">{label}</text></g>;
 const grid=(rows:number,cols:number,x=95,y=35,step=36)=>Array.from({length:rows*cols},(_,i)=><rect key={i} x={x+i%cols*step} y={y+Math.floor(i/cols)*step} width={step-7} height={step-7} rx="4" fill="currentColor" opacity={.12+(i%4)*.17}/>);
 const scenes:ReactNode[]=[
 <>{box(44,55,90,64,'x = 3')}<path d="M145 87h55m-12-10 12 10-12 10"/>{box(220,55,118,64,'y = x')}<text x="130" y="164">01 → 02 → 03</text></>,
 <>{box(50,48,290,65,'"hello, python"')}<path d="M106 124v18h135v-18"/><text x="142" y="179">[3 : 8]</text></>,
 <><path d="m200 25 65 50-65 50-65-50zM135 75H65v75m200-75h70v75"/>{box(35,146,65,40,'yes')}{box(295,146,65,40,'no')}<text x="180" y="83">if</text></>,
 <>{box(132,42,133,111,'f(x)')}<path d="M38 98h83m-12-10 12 10-12 10M277 98h82m-12-10 12 10-12 10"/><text x="32" y="76">in</text><text x="310" y="76">out</text></>,
 <><path d="M295 65a100 65 0 1 0 0 80M278 46l20 19-24 9"/>{box(128,73,134,64,'while')}<circle cx="302" cy="142" r="8" fill="currentColor"/></>,
 <>{[0,1,2,3].map(i=><g key={i}>{box(44+i*81,60,68,70,String(i+1))}</g>)}<path d="M47 144h300"/><text x="126" y="179">append →</text></>,
 <>{box(44,30,95,45,'key')}<path d="M150 52h55m-12-10 12 10-12 10M150 126h55m-12-10 12 10-12 10"/>{box(222,30,132,45,'value')}{box(44,104,95,45,'id')}{box(222,104,132,45,'42')}</>,
 <>{box(40,30,88,46,'a')}{box(40,122,88,46,'b')}<path d="M128 53q95 0 111 45M128 145q95 0 111-45"/>{box(240,60,110,80,'[1,2]')}</>,
 <>{box(70,30,262,144,'')}{box(114,72,174,72,'closure')}<path d="M87 51h35m181 103v30h-40"/><text x="151" y="56">scope</text></>,
 <><path d="m198 28 120 146H78z"/><path d="M198 76v42" strokeWidth="8"/><circle cx="198" cy="143" r="4" fill="currentColor"/><text x="43" y="38">try</text><text x="293" y="38">except</text></>,
 <>{[0,1,2].map(i=><g key={i}><rect x="70" y={29+i*52} width="34" height="34" rx="7"/><path d={`m78 ${46+i*52} 7 7 13-17M124 ${46+i*52}h195`}/></g>)}</>,
 <><path d="M112 24h129l52 51v107H112zM241 24v51h52M140 106h124M140 131h100M140 156h112"/><text x="145" y="71">.csv</text></>,
 <>{box(130,67,135,68,'import')}{box(32,19,91,38,'math')}{box(276,20,89,38,'json')}<path d="m110 57 30 30m149-30-34 30M197 137v39"/><circle cx="197" cy="182" r="7" fill="currentColor"/></>,
 <><path d="m200 23 110 49v91l-110 40-110-40V72zM90 72l110 46 110-46M200 118v85"/><text x="148" y="78">class</text></>,
 <>{[0,1,2].map(i=><g key={i}>{box(37+i*126,69,82,64,String(i))}{i<2&&<path d={`M${123+i*126} 102h35m-12-10 12 10-12 10`}/>}</g>)}<text x="126" y="176">yield →</text></>,
 <><path d="M66 160V30m0 130h275M70 151q45-5 86-42T325 46M70 155q150-12 255-15"/><text x="263" y="81">n²</text><text x="292" y="178">n</text></>,
 <>{grid(4,5)}<path d="M82 33H65v140h17m210-140h17v140h-17"/><text x="324" y="115">×</text></>,
 <><rect x="57" y="28" width="285" height="149" rx="8"/><path d="M57 63h285M135 28v149M235 28v149M57 101h285M57 140h285"/><rect x="58" y="29" width="283" height="32" fill="currentColor" opacity=".2"/></>,
 <><path d="M68 29v143h263"/>{[61,106,77,130,90].map((h,i)=><rect key={i} x={88+i*44} y={169-h} width="25" height={h} rx="3" fill="currentColor" opacity={.35+i*.12}/>)}</>,
 <><rect x="78" y="21" width="247" height="162" rx="10"/><path d="M105 21v162M124 52h170M124 86h104M124 117h170M124 150h132"/>{[44,78,112,146].map(y=><circle key={y} cx="78" cy={y} r="5" fill="currentColor"/>)}</>,
 <><path d="M61 169V32m0 137h277M84 145l216-98"/>{[[103,142],[126,111],[160,126],[189,80],[221,87],[254,55],[287,67]].map(([x,y],i)=><circle key={i} cx={x} cy={y} r="7" fill="currentColor"/>)}</>,
 <><path d="M49 49q145 227 295-14"/>{[[88,96],[136,130],[187,149],[235,137]].map(([x,y],i)=><g key={i}><circle cx={x} cy={y} r="7" fill="currentColor"/>{i<3&&<path d={`m${x+12} ${y+8} 24 12`}/>}</g>)}<text x="244" y="54">−∇L</text></>,
 <>{grid(4,6,91,24,37)}<rect x="150" y="53" width="88" height="82" rx="3" strokeWidth="3"/><path d="M66 25H48v25m274-25h22v25M48 153v25h18m278-25v25h-22"/></>,
 <>{box(33,63,89,68,'API')}{box(275,63,91,68,'SQL')}<path d="M134 88h124m-13-10 13 10-13 10M258 112H134m13-10-13 10 13 10"/><text x="151" y="164">{`{ json }`}</text></>
 ];
 return <svg viewBox="0 0 400 210" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className="course-art"><g>{scenes[index % scenes.length]}</g></svg>;
}
