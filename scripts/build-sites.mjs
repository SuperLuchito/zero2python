import {cpSync,mkdirSync,writeFileSync,readFileSync,rmSync} from 'node:fs';
const course=JSON.parse(readFileSync('content/course.json','utf8'));
const resources=JSON.parse(readFileSync('content/resources.json','utf8'));
const book=JSON.parse(readFileSync('content/book.json','utf8'));
const lessons=course.lessons;
const catalog={taskKeys:lessons.flatMap(l=>l.tasks.map(t=>`${l.id}::${t.id}`)),resourceKeys:[],challengeKeys:[],bookKeys:book.chapters.flatMap(c=>[`${c.id}:read`,...c.questions.map(q=>q.id)])};
for(const [id,v] of Object.entries(resources.topics??resources)){if(!v||!v.resources)continue;catalog.resourceKeys.push(...v.resources.map(r=>`${id}:${r.id}`));catalog.challengeKeys.push(...(v.challenges??[]).map(c=>`${id}:${c.id}`));}
if(catalog.taskKeys.length!==79||catalog.resourceKeys.length<33||catalog.challengeKeys.length!==99)throw new Error('Invalid catalog coverage: '+JSON.stringify(Object.fromEntries(Object.entries(catalog).map(([k,v])=>[k,v.length]))));
rmSync('dist',{recursive:true,force:true});mkdirSync('dist/server',{recursive:true});mkdirSync('dist/.openai',{recursive:true});cpSync('out','dist/client',{recursive:true});cpSync('.openai/hosting.json','dist/.openai/hosting.json');cpSync('server/worker.mjs','dist/server/index.js');writeFileSync('dist/server/catalog.mjs',Object.entries(catalog).map(([k,v])=>`export const ${k}=${JSON.stringify(v)};`).join('\n'));cpSync('drizzle','dist/.openai/drizzle',{recursive:true});
