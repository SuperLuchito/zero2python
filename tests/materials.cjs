const assert=require('node:assert/strict');
const fs=require('node:fs');const vm=require('node:vm');const ts=require('typescript');
const course=require('../content/course.json');const sources=require('../content/resources.json');
const data=new Map();const localStorage={getItem:k=>data.get(k)||null,setItem:(k,v)=>data.set(k,v)};
const window={dispatchEvent:()=>{}};
function load(path){const exports={};vm.runInNewContext(ts.transpileModule(fs.readFileSync(path,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}}).outputText,{exports,localStorage,window,Event:class{},require:n=>n==='./storage'?load('lib/storage.ts'):n==='./account'?{profileKey:k=>k,queueProgress:()=>{},currentProfile:()=>null}:require(n)});return exports;}
const {getStudy,updateStudy,topicComplete,emptyStudy}=load('lib/material-progress.ts');
assert.equal(Object.keys(sources).length,course.lessons.length);
for(const l of course.lessons){const s=sources[l.id];assert(s.resources.some(r=>r.kind==='video'),l.id+' missing video');assert(s.challenges.length,l.id+' missing LeetCode');assert.equal(new Set(s.resources.map(r=>r.id)).size,s.resources.length);for(const r of s.resources){assert(r.description&&r.focus&&r.author);assert.equal(new URL(r.url).protocol,'https:');if(r.kind==='video'){assert.match(r.youtubeId,/^[\w-]{11}$/);assert.equal(new URL(r.url).searchParams.get('v'),r.youtubeId);}}}
const l={...course.lessons[0],...sources.L01};const p={tasks:{},qotd:{}};const study=emptyStudy();
assert.equal(topicComplete(l,study,p),false);
for(const r of l.resources)study.materials[`${l.id}:${r.id}`]=true;
for(const t of l.tasks)p.tasks[`${l.id}::${t.id}`]='solved';
assert.equal(topicComplete(l,study,p),false,'Screenshot still required');
for(const c of l.challenges)study.evidence[`${l.id}:${c.id}`]=true;
assert.equal(topicComplete(l,study,p),true);
p.tasks[`${l.id}::${l.tasks[0].id}`]='gave_up';assert.equal(topicComplete(l,study,p),false,'Give up is not success');
p.tasks[`${l.id}::${l.tasks[0].id}`]='solved_hinted';assert.equal(topicComplete(l,study,p),true);
study.materials[`${l.id}:${l.resources[0].id}`]=false;assert.equal(topicComplete(l,study,p),false,'Unwatch revokes completion');
updateStudy('materials','test',true);assert.equal(getStudy().materials.test,true);updateStudy('materials','test',false);assert.equal(getStudy().materials.test,false);
data.set('z2p-study.v1','broken');assert.equal(Object.keys(getStudy().materials).length,0);
console.log('Materials: topic coverage, video URLs, persistence and combined completion rules passed');

const guides=require('../content/task-guides.json');
const tasks=course.lessons.flatMap(l=>l.tasks);
assert.equal(Object.keys(guides).length,tasks.length);
for(const t of tasks){assert(guides[t.id].input&&guides[t.id].output&&guides[t.id].prompt,t.id+' incomplete task contract');assert(!/по правилам лекции|заданы в лекции/.test(guides[t.id].prompt),t.id+' relies on removed lecture');}
const playlistVideos=Object.values(sources).flatMap(s=>s.resources).filter(r=>r.id.startsWith('ivan-'));
assert.equal(new Set(playlistVideos.map(r=>r.youtubeId)).size,25);
for(const s of Object.values(sources))assert(s.challenges.length===3 && s.challenges.some(c=>c.difficulty==='Medium'));
console.log('Playlist: all 25 videos; standalone task contracts and expanded LeetCode coverage passed');

for(const t of tasks)assert(guides[t.id].cases?.length,t.id+" missing structured examples");
