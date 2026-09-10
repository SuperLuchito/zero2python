import { taskKeys, resourceKeys, challengeKeys, bookKeys } from './catalog.mjs';
const PROFILES=['Lukyan','Maria','Egor'];
const marks=['untouched','hinted','gave_up','solved','solved_hinted'];
const json=(value,status=200,headers={})=>Response.json(value,{status,headers:{'Cache-Control':'no-store',...headers}});
const error=(message,status=400)=>json({error:message},status);
const cookie=(token,request,maxAge=2592000)=>`z2p_session=${token}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${maxAge}${new URL(request.url).protocol==='https:'?'; Secure':''}`;
async function profileFor(request,env){const token=request.headers.get('cookie')?.match(/(?:^|;\s*)z2p_session=([a-f0-9-]{36})/)?.[1];if(!token)return null;return (await env.DB.prepare('SELECT profile FROM sessions WHERE token=? AND expires>?').bind(token,new Date().toISOString()).first())?.profile??null;}
async function body(request,limit=100000){
 const reader=request.body?.getReader();if(!reader)throw new Error('Пустой запрос');const chunks=[];let size=0;
 while(true){const {done,value}=await reader.read();if(done)break;size+=value.length;if(size>limit){await reader.cancel();throw new Error('Слишком большой запрос');}chunks.push(value);}
 const bytes=new Uint8Array(size);let offset=0;for(const chunk of chunks){bytes.set(chunk,offset);offset+=chunk.length;}return JSON.parse(new TextDecoder().decode(bytes));
}
function validEvent(e){if(!e||typeof e.key!=='string')return false;
 if(e.kind==='tasks')return taskKeys.includes(e.key)&&marks.includes(e.value);
 if(e.kind==='materials')return resourceKeys.includes(e.key)&&typeof e.value==='boolean';
 if(e.kind==='book')return bookKeys.includes(e.key)&&typeof e.value==='boolean';
 if(e.kind==='qotd')return /^\d{4}-\d{2}-\d{2}$/.test(e.key)&&e.value&&typeof e.value.qid==='string'&&e.value.qid.length<80&&typeof e.value.ok==='boolean';
 return false;
}
async function upsert(env,profile,e){const value=JSON.stringify(e.value);return env.DB.prepare(`INSERT INTO progress(profile,kind,key,value,updated_at) VALUES(?,?,?,?,?) ON CONFLICT(profile,kind,key) DO UPDATE SET value=CASE
 WHEN progress.kind='qotd' THEN progress.value
 WHEN progress.kind='tasks' AND (progress.value='"solved_hinted"' OR (progress.value='"hinted"' AND excluded.value='"solved"') OR (progress.value='"solved"' AND excluded.value='"hinted"')) THEN '"solved_hinted"'
 WHEN progress.kind='tasks' AND progress.value IN ('"solved"','"solved_hinted"') AND excluded.value IN ('"gave_up"','"untouched"') THEN progress.value
 ELSE excluded.value END,updated_at=excluded.updated_at`).bind(profile,e.kind,e.key,value,new Date().toISOString());}
async function handle(request,env){
 const url=new URL(request.url),path=url.pathname.replace(/\/$/,'');
 if(!path.startsWith('/api/'))return env.ASSETS.fetch(request);
 if(!env.DB)return error('Общее хранилище пока недоступно.',503);
 if(!['GET','HEAD'].includes(request.method)&&request.headers.get('origin')!==url.origin)return error('Запрос с другого сайта отклонён.',403);
 if(path==='/api/session'&&request.method==='POST'){
  const b=await body(request);const profile=PROFILES.find(p=>p.toLowerCase()===String(b.nickname).trim().toLowerCase());if(!profile)return error('Введите Lukyan, Maria или Egor.');
  const token=crypto.randomUUID();await env.DB.batch([env.DB.prepare('DELETE FROM sessions WHERE expires<?').bind(new Date().toISOString()),env.DB.prepare('INSERT INTO sessions(token,profile,expires) VALUES(?,?,?)').bind(token,profile,new Date(Date.now()+2592000000).toISOString())]);
  return json({profile},200,{'Set-Cookie':cookie(token,request)});
 }
 const profile=await profileFor(request,env);
 if(path==='/api/session'&&request.method==='GET')return json({profile});
 if(!profile)return error('Сначала выберите свой профиль.',401);
 if(request.headers.get('X-Z2P-Profile')&&request.headers.get('X-Z2P-Profile')!==profile)return error('Профиль изменён в другой вкладке. Перезагрузите страницу перед продолжением.',409);
 if(path==='/api/session'&&request.method==='DELETE'){
  const token=request.headers.get('cookie')?.match(/z2p_session=([a-f0-9-]{36})/)?.[1];await env.DB.prepare('DELETE FROM sessions WHERE token=?').bind(token).run();return json({ok:true},200,{'Set-Cookie':cookie('',request,0)});
 }
 if(path==='/api/progress'&&request.method==='GET'){
  const {results}=await env.DB.prepare('SELECT kind,key,value FROM progress WHERE profile=?').bind(profile).all();return json({records:results.map(r=>({...r,value:JSON.parse(r.value)})),allowed:{tasks:taskKeys,materials:resourceKeys,book:bookKeys}});
 }
 if(path==='/api/progress'&&request.method==='POST'){
  const b=await body(request);if(!Array.isArray(b.events)||b.events.length>1000||!b.events.every(validEvent))return error('Неверный формат прогресса.');
  const statements=await Promise.all(b.events.map(e=>upsert(env,profile,e)));if(statements.length)await env.DB.batch(statements);return json({ok:true});
 }
 if(path==='/api/leaderboard'&&request.method==='GET'){
  const {results}=await env.DB.prepare('SELECT profile,kind,key,value,updated_at FROM progress').all();
  const members=PROFILES.map(name=>{const rows=results.filter(r=>r.profile===name);return {name,solved:rows.filter(r=>r.kind==='tasks'&&taskKeys.includes(r.key)&&['"solved"','"solved_hinted"'].includes(r.value)).length,materials:rows.filter(r=>r.kind==='materials'&&r.value==='true').length,leetcode:rows.filter(r=>r.kind==='evidence'&&r.value==='true').length,read:rows.filter(r=>r.kind==='book'&&r.key.endsWith(':read')&&r.value==='true').length,updatedAt:rows.map(r=>r.updated_at).sort().at(-1)??null};}).sort((a,b)=>b.solved-a.solved||PROFILES.indexOf(a.name)-PROFILES.indexOf(b.name));
  return json({profile,members:members.map((m,i)=>({...m,rank:members.findIndex(x=>x.solved===m.solved)+1})),total:taskKeys.length});
 }
 if(path==='/api/evidence'){
  const key=url.searchParams.get('key');if(!challengeKeys.includes(key))return error('Задача не найдена.',404);if(!env.BUCKET)return error('Хранилище скриншотов недоступно.',503);
  const objectKey=`evidence/${profile}/${key}`;
  if(request.method==='GET'){const object=await env.BUCKET.get(objectKey);if(!object)return error('Скриншот не найден.',404);return new Response(object.body,{headers:{'Content-Type':object.httpMetadata?.contentType||'application/octet-stream','Cache-Control':'private, no-store','X-Content-Type-Options':'nosniff'}});}
  if(request.method==='PUT'){
   const type=request.headers.get('content-type');if(!['image/png','image/jpeg','image/webp'].includes(type))return error('Прикрепите PNG, JPEG или WebP.');
   if(Number(request.headers.get('content-length'))>8388608)return error('Размер файла больше 8 МБ.',413);
   const reader=request.body?.getReader();if(!reader)return error('Пустой файл.');let size=0;const chunks=[];while(true){const {done,value}=await reader.read();if(done)break;size+=value.length;if(size>8388608){await reader.cancel();return error('Размер файла больше 8 МБ.',413);}chunks.push(value);}
   const bytes=new Uint8Array(size);let offset=0;for(const c of chunks){bytes.set(c,offset);offset+=c.length;}
   const png=bytes[0]===137&&bytes[1]===80&&bytes[2]===78&&bytes[3]===71;const jpg=bytes[0]===255&&bytes[1]===216&&bytes[2]===255;const webp=new TextDecoder().decode(bytes.slice(0,4))==='RIFF'&&new TextDecoder().decode(bytes.slice(8,12))==='WEBP';
   if(!(type==='image/png'&&png||type==='image/jpeg'&&jpg||type==='image/webp'&&webp))return error('Содержимое файла не соответствует изображению.');
   await env.BUCKET.put(objectKey,bytes,{httpMetadata:{contentType:type}});await (await upsert(env,profile,{kind:'evidence',key,value:true})).run();return json({ok:true});
  }
  if(request.method==='DELETE'){await env.BUCKET.delete(objectKey);await (await upsert(env,profile,{kind:'evidence',key,value:false})).run();return json({ok:true});}
 }
 return error('Не найдено.',404);
}
export default {async fetch(request,env){try{return await handle(request,env);}catch(e){console.error('Request failed',e);return error('Не удалось сохранить или загрузить данные. Повторите попытку.',503);}}};
