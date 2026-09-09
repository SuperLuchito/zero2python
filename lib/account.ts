export const profiles = ['Lukyan','Maria','Egor'] as const;
export type Profile = typeof profiles[number];
export function currentProfile():Profile|null {
  if(typeof window==='undefined')return null;
  try {const value=sessionStorage.getItem('z2p-profile');return profiles.find(p=>p===value)??null;}catch{return null;}
}
export function profileKey(key:string){return `${key}:${currentProfile()??'guest'}`;}
export type RecordKind='tasks'|'qotd'|'materials'|'evidence'|'book';
export type SavedEvent={kind:RecordKind;key:string;value:unknown};
let sending:Promise<void>|null=null;
export async function api(path:string,init?:RequestInit){
  const response=await fetch(`/api/${path}`,{...init,headers:{'Content-Type':'application/json',...(currentProfile()?{'X-Z2P-Profile':currentProfile()!}:{}),...init?.headers},cache:'no-store'});
  if(!response.ok){let message='Не удалось связаться с хранилищем. Попробуйте ещё раз.';try{message=(await response.json()).error||message;}catch{}throw new Error(message);}
  return response.json();
}
function queued():SavedEvent[]{try{return JSON.parse(localStorage.getItem(profileKey('z2p-pending'))||'[]');}catch{return [];}}
export function queueProgress(event:SavedEvent){
  if(!currentProfile())return;
  const list=queued().filter(x=>x.kind!==event.kind||x.key!==event.key);list.push(event);
  localStorage.setItem(profileKey('z2p-pending'),JSON.stringify(list));
  window.dispatchEvent(new Event('py-term-progress'));
  void flushProgress().catch(()=>{});
}
export function pendingCount(){return queued().length;}
export function flushProgress():Promise<void>{
  if(sending)return sending.then(()=>flushProgress());
  const owner=currentProfile();if(!owner)return Promise.resolve();
  sending=(async()=>{while(currentProfile()===owner){const batch=queued();if(!batch.length)return;
    await api('progress',{method:'POST',body:JSON.stringify({events:batch})});
    if(currentProfile()!==owner)return;
    const remaining=queued().filter(x=>!batch.some(b=>b.kind===x.kind&&b.key===x.key&&JSON.stringify(b.value)===JSON.stringify(x.value)));
    localStorage.setItem(profileKey('z2p-pending'),JSON.stringify(remaining));
  }})().finally(()=>{sending=null;window.dispatchEvent(new Event('z2p-sync'));});return sending;
}
export async function loadAccount(profile:Profile){
  sessionStorage.setItem('z2p-profile',profile);
  // Existing unscoped work belongs to the owner who used this browser before team profiles.
  const migrated=`z2p-migrated:${profile}`;
  if(profile==='Lukyan'&&!localStorage.getItem(migrated)){
    for(const [root,kinds] of [['py-term.v1',['tasks','qotd']],['z2p-study.v1',['materials']]] as const){
      let old:Record<string,Record<string,unknown>>={};try{old=JSON.parse(localStorage.getItem(root)||'{}');}catch{}
      for(const kind of kinds)for(const [key,value] of Object.entries(old[kind]||{})){
        const list=queued();if(!list.some(e=>e.kind===kind&&e.key===key))list.push({kind,key,value});localStorage.setItem(profileKey('z2p-pending'),JSON.stringify(list));
      }
    }localStorage.setItem(migrated,'1');
  }
  const result=await api('progress');
  const allowed=result.allowed as Record<string,string[]>;
  const before=queued();
  const valid=before.filter(e=>e.kind==='qotd'? /^\d{4}-\d{2}-\d{2}$/.test(e.key) : allowed[e.kind]?.includes(e.key));
  if(valid.length!==before.length)localStorage.setItem(profileKey('z2p-legacy-pending'),JSON.stringify(before));
  localStorage.setItem(profileKey('z2p-pending'),JSON.stringify(valid));
  await flushProgress();
  const latest=await api('progress');
  const state:Record<string,Record<string,unknown>>={tasks:{},qotd:{},materials:{},evidence:{},book:{}};
  for(const r of latest.records){if(r.kind in state)state[r.kind][r.key]=r.value;}
  localStorage.setItem(profileKey('py-term.v1'),JSON.stringify({tasks:state.tasks,qotd:state.qotd}));
  localStorage.setItem(profileKey('z2p-study.v1'),JSON.stringify({materials:state.materials,evidence:state.evidence}));
  localStorage.setItem(profileKey('z2p-book.v1'),JSON.stringify(state.book));
  window.dispatchEvent(new Event('py-term-progress'));
}
export function getBookProgress():Record<string,boolean>{try{return JSON.parse(localStorage.getItem(profileKey('z2p-book.v1'))||'{}');}catch{return {};}}
export function markBook(key:string,value:boolean){const p=getBookProgress();p[key]=value;localStorage.setItem(profileKey('z2p-book.v1'),JSON.stringify(p));queueProgress({kind:'book',key,value});return p;}
export async function signOut(){await flushProgress();await api('session',{method:'DELETE'});sessionStorage.removeItem('z2p-profile');}
