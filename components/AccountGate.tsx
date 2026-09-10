'use client';
import { useEffect,useState } from 'react';
import Link from 'next/link';
import { api,loadAccount,flushProgress,pendingCount, currentProfile } from '@/lib/account';
export function AccountGate({children}:{children:React.ReactNode}){
 const [ready,setReady]=useState(false),[error,setError]=useState(''),[pending,setPending]=useState(0);
 async function start(){setError('');try{const {profile}=await api('session');if(!profile){location.replace('/');return;}await loadAccount(profile);setReady(true);}catch(e){setError((e as Error).message);}}
 useEffect(()=>{void start();const sync=()=>{setPending(pendingCount());};const retry=()=>{void flushProgress().catch(()=>{});};window.addEventListener('z2p-sync',sync);window.addEventListener('py-term-progress',sync);window.addEventListener('online',retry);const timer=setInterval(retry,15000);return()=>{window.removeEventListener('z2p-sync',sync);window.removeEventListener('py-term-progress',sync);window.removeEventListener('online',retry);clearInterval(timer);};},[]);
 useEffect(()=>{
  if(!ready)return;
  const context=(document as Document & {modelContext?:{registerTool:(tool:unknown,options:{signal:AbortSignal})=>void|Promise<void>}}).modelContext;
  if(!context)return;
  const lifecycle=new AbortController();
  try{void Promise.resolve(context.registerTool({name:'read_team_progress',title:'Прогресс команды',description:'Показать текущий рейтинг и счётчики команды, как во вкладке Лидерборд. Не изменяет результаты.',inputSchema:{type:'object',properties:{},additionalProperties:false},annotations:{readOnlyHint:true,untrustedContentHint:false},execute:async(input:unknown)=>{if(!input||typeof input!=='object'||Array.isArray(input)||Object.keys(input).length)throw new Error('Ожидается пустой объект');return api('leaderboard');}},{signal:lifecycle.signal})).catch(()=>{});}catch{}
  return()=>lifecycle.abort();
 },[ready]);
 if(!ready)return <main className="account-loading"><h1>{error?'Не удалось загрузить профиль':'Загружаем ваш прогресс…'}</h1>{error&&<><p role="alert">{error}</p><button onClick={start}>Повторить</button> <Link href="/">К выбору профиля</Link></>}</main>;
 return <>{pending>0&&<div className="sync-notice" role="status">{currentProfile()}: изменения сохранены на устройстве. Ожидаем синхронизацию. <button onClick={()=>void flushProgress().catch(()=>{})}>Повторить</button></div>}{children}</>;
}
