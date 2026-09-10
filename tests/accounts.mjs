import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {readFileSync} from 'node:fs';
import worker from '../dist/server/index.js';
import {taskKeys,resourceKeys,challengeKeys,bookKeys} from '../dist/server/catalog.mjs';
const db=new DatabaseSync(':memory:');db.exec(readFileSync(new URL('../drizzle/0000_happy_mockingbird.sql',import.meta.url),'utf8'));
const DB={prepare(sql){const s=db.prepare(sql);return {bind(...args){return {async first(){return s.get(...args)},async all(){return {results:s.all(...args)}},async run(){return s.run(...args)}}},async all(){return {results:s.all()}}};},async batch(statements){return Promise.all(statements.map(s=>s.run()));}};
const objects=new Map(),BUCKET={async put(k,bytes,metadata){objects.set(k,{body:bytes,...metadata})},async get(k){return objects.get(k)},async delete(k){objects.delete(k)}};
const env={DB,BUCKET,ASSETS:{fetch:async()=>new Response('page')}};
async function req(path,method='GET',body,cookie='',headers={}){return worker.fetch(new Request('https://example.test/api/'+path,{method,headers:{origin:'https://example.test',cookie,...headers},body:body===undefined?undefined:JSON.stringify(body)}),env);}
assert.equal((await req('progress')).status,401);
assert.equal((await req('session','POST',{nickname:'unknown'})).status,400);
const cookies={};for(const name of ['Lukyan','Maria','Egor']){const r=await req('session','POST',{nickname:name.toLowerCase()});assert.equal(r.status,200);assert.equal((await r.json()).profile,name);cookies[name]=r.headers.get('set-cookie').split(';')[0];}
assert.equal((await req('progress','POST',{events:[{kind:'tasks',key:taskKeys[0],value:'solved'}]},cookies.Lukyan,{'X-Z2P-Profile':'Maria'})).status,409);
for(const name of ['Lukyan','Maria'])assert.equal((await req('progress','POST',{events:[{kind:'tasks',key:taskKeys[0],value:'solved'},{kind:'materials',key:resourceKeys[0],value:true},{kind:'book',key:bookKeys[0],value:true}]},cookies[name])).status,200);
await req('progress','POST',{events:[{kind:'tasks',key:taskKeys[0],value:'gave_up'}]},cookies.Lukyan);
let board=await (await req('leaderboard','GET',undefined,cookies.Egor)).json();assert.deepEqual(board.members.map(m=>m.rank),[1,1,3]);assert.deepEqual(board.members.map(m=>m.solved),[1,1,0]);
assert.equal((await (await req('progress','GET',undefined,cookies.Egor)).json()).records.length,0);
assert.equal((await req('progress','POST',{events:[{kind:'evidence',key:challengeKeys[0],value:true}]},cookies.Lukyan)).status,400,'Proof cannot be claimed without upload');
const png=new Uint8Array([137,80,78,71,13,10,26,10]);const put=await worker.fetch(new Request('https://example.test/api/evidence?key='+encodeURIComponent(challengeKeys[0]),{method:'PUT',headers:{origin:'https://example.test',cookie:cookies.Lukyan,'Content-Type':'image/png'},body:png}),env);assert.equal(put.status,200);
assert.equal((await req('evidence?key='+encodeURIComponent(challengeKeys[0]),'GET',undefined,cookies.Maria)).status,404);
assert.equal((await req('evidence?key='+encodeURIComponent(challengeKeys[0]),'GET',undefined,cookies.Lukyan)).status,200);
assert.equal((await req('evidence?key='+encodeURIComponent(challengeKeys[0]),'DELETE',undefined,cookies.Lukyan)).status,200);
assert.equal((await req('session','DELETE',undefined,cookies.Lukyan)).status,200);assert.equal((await req('progress','GET',undefined,cookies.Lukyan)).status,401);
assert.equal((await worker.fetch(new Request('https://example.test/api/session',{method:'POST',headers:{origin:'https://evil.test'},body:'{}'}),env)).status,403);
console.log('Accounts: 3 sessions, profile isolation, ranking ties, persisted events, evidence ownership, logout and origin checks passed');
