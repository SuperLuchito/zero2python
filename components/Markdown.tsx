import { Fragment, type ReactNode } from 'react';
import { highlightPython } from '@/lib/highlight';

function inline(text: string): ReactNode[] {
  return text.split(/(`[^`]+`|\*\*[^*]+\*\*|\[[^\]]+\]\([^\s)]+\))/g).map((part,i) => {
    if(part.startsWith('`')) return <code key={i}>{part.slice(1,-1)}</code>;
    if(part.startsWith('**')) return <strong key={i}>{part.slice(2,-2)}</strong>;
    const link=part.match(/^\[([^\]]+)\]\(([^)]+)\)$/);
    if(link) return /^(https?:\/\/|\/curriculum\/)/.test(link[2]) ? <a key={i} href={link[2]} target="_blank" rel="noreferrer">{link[1]}</a> : <span key={i}>{link[1]}</span>;
    return part;
  });
}
/** Render the authored subset of Markdown; raw HTML is never executed. */
export function Markdown({text}:{text:string}) {
  const lines=text.replace(/\r/g,'').split('\n'); const nodes: ReactNode[]=[];
  for(let i=0;i<lines.length;) {
    const line=lines[i]; const key=i;
    if(!line.trim() || /^---+$/.test(line)) {i++;continue;}
    if(line.startsWith('```')) {
      const language=line.slice(3).trim();const code=[];i++;
      while(i<lines.length&&!lines[i].startsWith('```'))code.push(lines[i++]);i++;
      nodes.push(<div className="reading-code" key={key}><span>{language||'текст'}</span><pre>{language==='python'?<code dangerouslySetInnerHTML={{__html:highlightPython(code.join('\n'))}}/>:<code>{code.join('\n')}</code>}</pre></div>);continue;
    }
    if(line.startsWith('<details>')) {
      const summary=line.match(/<summary>(.*?)<\/summary>/)?.[1]||'Показать объяснение'; const body=[];i++;
      while(i<lines.length&&!lines[i].includes('</details>'))body.push(lines[i++]);i++;
      nodes.push(<details key={key}><summary>{inline(summary)}</summary><Markdown text={body.join('\n')}/></details>);continue;
    }
    const heading=line.match(/^(#{1,6}) (.*)/);
    if(heading) {nodes.push(heading[1].length<3?<h2 key={key}>{inline(heading[2])}</h2>:<h3 key={key}>{inline(heading[2])}</h3>);i++;continue;}
    if(line.startsWith('|')) {
      const rows:string[][]=[];
      while(i<lines.length&&lines[i].startsWith('|')) {const row=lines[i++].replace(/^\||\|$/g,'').split('|').map(x=>x.trim());if(!row.every(x=>/^:?-+:?$/.test(x))) rows.push(row);}
      nodes.push(<div className="reading-table" key={key}><table><thead><tr>{rows[0]?.map((c,j)=><th key={j}>{inline(c)}</th>)}</tr></thead><tbody>{rows.slice(1).map((r,j)=><tr key={j}>{r.map((c,k)=><td key={k}>{inline(c)}</td>)}</tr>)}</tbody></table></div>);continue;
    }
    if(/^\s*(?:[-*]|\d+\.) /.test(line)) {
      const items=[];const ordered=/^\d+\./.test(line);
      while(i<lines.length&&/^\s*(?:[-*]|\d+\.) /.test(lines[i]))items.push(lines[i++].replace(/^\s*(?:[-*]|\d+\.) /,''));
      const children=items.map((v,j)=><li key={j}>{inline(v)}</li>);nodes.push(ordered?<ol key={key}>{children}</ol>:<ul key={key}>{children}</ul>);continue;
    }
    const paragraph=[line];i++;
    while(i<lines.length&&lines[i].trim()&&!/^(#|```|\||<details>|\s*[-*] |\d+\. )/.test(lines[i]))paragraph.push(lines[i++]);
    nodes.push(<p key={key}>{inline(paragraph.join(' '))}</p>);
  }
  return <div className="reading-markdown">{nodes.map((node,i)=><Fragment key={i}>{node}</Fragment>)}</div>;
}
