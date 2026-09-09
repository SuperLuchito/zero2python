// Suggestions are deliberately restricted to names introduced earlier in this file.
export function variableSuggestions(source:string,caret:number) {
 const before=source.slice(0,caret), prefix=before.match(/[A-Za-z_]\w*$/)?.[0]??'';
 if(!prefix||before[before.length-prefix.length-1]==='.')return [];
 let clean='',quote='',triple=false,comment=false;
 for(let i=0;i<before.length;i++){
  const c=before[i];
  if(comment){if(c==='\n'){comment=false;clean+='\n';}else clean+=' ';continue;}
  if(quote){if(c==='\\'){clean+='  ';i++;continue;}if(before.slice(i,i+(triple?3:1))===quote.repeat(triple?3:1)){clean+=' '.repeat(triple?3:1);i+=triple?2:0;quote='';}else clean+=c==='\n'?'\n':' ';continue;}
  if(c==='#'){comment=true;clean+=' ';continue;}
  if(c==='"'||c==="'"){quote=c;triple=before.slice(i,i+3)===c.repeat(3);clean+=' '.repeat(triple?3:1);i+=triple?2:0;continue;}
  clean+=c;
 }
 if(quote||comment)return [];
 const names=new Set<string>();
 for(const m of clean.matchAll(/(?:^|\n)\s*([A-Za-z_]\w*(?:\s*,\s*[A-Za-z_]\w*)*)\s*(?::[^=\n]+)?=(?!=)/g))for(const n of m[1].split(','))names.add(n.trim());
 for(const m of clean.matchAll(/\bfor\s+([A-Za-z_]\w*(?:\s*,\s*[A-Za-z_]\w*)*)\s+in\b/g))for(const n of m[1].split(','))names.add(n.trim());
 for(const m of clean.matchAll(/\bdef\s+\w+\s*\(([^)]*)\)/g))for(const p of m[1].split(',')){const n=p.trim().match(/^\*{0,2}([A-Za-z_]\w*)/)?.[1];if(n)names.add(n);}
 const keywords=new Set('False None True and as assert async await break class continue def del elif else except finally for from global if import in is lambda nonlocal not or pass raise return try while with yield'.split(' '));
 return [...names].filter(n=>n!==prefix&&n.startsWith(prefix)&&!keywords.has(n)).sort().slice(0,8);
}
