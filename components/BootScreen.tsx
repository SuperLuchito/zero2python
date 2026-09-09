'use client';
import { useEffect,useState } from 'react';
import { useRouter } from 'next/navigation';
import { Logo } from './Logo';
import {api,loadAccount,profiles,type Profile} from '@/lib/account';
const lines=['$ connect zero2python','✓ Рабочее пространство готово','Python / нейросети / анализ данных'];
export function BootScreen(){
 const router=useRouter(),[step,setStep]=useState(0),[name,setName]=useState(''),[profile,setProfile]=useState<Profile|null>(null),[busy,setBusy]=useState(false),[error,setError]=useState('');
 useEffect(()=>{if(step>=lines.length)return;const timer=setTimeout(()=>setStep(n=>n+1),250);return()=>clearTimeout(timer);},[step]);
 async function login(e:React.FormEvent){e.preventDefault();setBusy(true);setError('');try{const {profile}=await api('session',{method:'POST',body:JSON.stringify({nickname:name})});await loadAccount(profile);setProfile(profile);}catch(e){setError((e as Error).message);}finally{setBusy(false);}}
 return <main className="terminal-entry"><section className="entry-window" aria-label="Терминал Zero to Python"><header><Logo/><span>workspace / connect</span><span className="window-dots" aria-hidden="true"><i/><i/><i/></span></header><div className="entry-content"><div className="entry-lines">{lines.map((l,i)=><p key={l} className={i<step?'visible':''} aria-hidden={i>=step}>{l}</p>)}</div><form onSubmit={login} className="login-form"><label htmlFor="nickname">Представьтесь, чтобы открыть свой прогресс</label><div className="nickname-field"><span aria-hidden="true">❯</span><input id="nickname" autoComplete="username" placeholder="Ваш никнейм" value={name} disabled={busy||!!profile} onChange={e=>setName(e.target.value)} required/><button disabled={busy||!!profile||!name.trim()}>{busy?'Подключаем…':'Войти ↵'}</button></div><p className="login-hint">{profiles.join(' · ')}<br/>Вход без пароля. Выберите только свой профиль.</p></form>{error&&<p role="alert" className="upload-error">{error}</p>}{profile&&<p className="login-success" role="status">✓ {profile}, ваш прогресс загружен.</p>}<button className="entry-go" disabled={!profile} onClick={()=>router.push('/app')}>Открыть обучение <span>→</span></button></div><footer><span>{profile?`Профиль: ${profile}`:'Ожидание входа'}</span><span>UTF-8 · Python</span></footer></section></main>;
}
