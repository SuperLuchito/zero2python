'use client';
export type TraceStep = {line:number;event:string;phase:string;scope:string;variables:Record<string,string>;stdout:string};
export type RunResult = {ok:boolean;stdout:string;error:string;images:string[];trace?:TraceStep[];traceTruncated?:boolean;diagnostic?:{name:string;message:string;line:number|null}|null};
let worker:Worker|null=null;
let sequence=0;
let packages:string[]=[];
let booted:Promise<void>|null=null;
const pending=new Map<number,{resolve:(value:unknown)=>void;reject:(error:Error)=>void;timer:ReturnType<typeof setTimeout>}>();
function reset(message:string){
  worker?.terminate();worker=null;booted=null;
  for(const item of pending.values()){clearTimeout(item.timer);item.reject(new Error(message));}
  pending.clear();
}
function request(kind:string,payload:object,timeout:number):Promise<unknown>{
  if(!worker){
    worker=new Worker('/python-worker.js');
    worker.onmessage=({data})=>{const item=pending.get(data.id);if(!item)return;clearTimeout(item.timer);pending.delete(data.id);if(data.error)item.reject(new Error(data.error));else item.resolve(data.result);};
    worker.onerror=()=>reset('Не удалось загрузить Python. Проверьте соединение и повторите запуск.');
  }
  return new Promise((resolve,reject)=>{const id=++sequence;const timer=setTimeout(()=>reset(kind==='run'?'Выполнение остановлено через 15 секунд. Проверьте условие цикла и повторите запуск.':'Загрузка Python заняла слишком долго. Повторите попытку.'),timeout);pending.set(id,{resolve,reject,timer});worker!.postMessage({id,kind,...payload});});
}
export async function bootPython(needed:boolean|string[],line:(s:string)=>void):Promise<void>{
  const wanted=typeof needed==='boolean'?(needed?['numpy','pandas']:[]):needed;
  packages=[...new Set([...packages,...wanted])];
  line('Загрузка Python'+(wanted.length?` и ${wanted.join(', ')}`:'')+'…');
  const previous=booted;
  booted=(async()=>{if(previous)await previous;await request('boot',{packages},180000);})();
  try{await booted;line('Python готов.');}catch(e){booted=null;throw e;}
}
export async function runTests(user:string,tests:string):Promise<RunResult>{
  if(!booted)await bootPython(packages,()=>{});else await booted;
  return await request('run',{user,tests},15000) as RunResult;
}
export function runOpen(user:string){return runTests(user,'pass');}
