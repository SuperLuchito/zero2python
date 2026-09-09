import {profileKey,queueProgress,currentProfile} from './account';
import { lessonStatus, type Progress } from './storage';
import type { Lesson } from './types';
export type StudyProgress={materials:Record<string,boolean>;evidence:Record<string,boolean>};
const KEY='z2p-study.v1';
export const emptyStudy=():StudyProgress=>({materials:{},evidence:{}});
export function getStudy():StudyProgress {try {const value=JSON.parse(localStorage.getItem(profileKey(KEY))||'{}');return {materials:value.materials||{},evidence:value.evidence||{}};}catch{return emptyStudy();}}
export function updateStudy(kind:'materials'|'evidence',id:string,value:boolean){const p=getStudy();p[kind][id]=value;localStorage.setItem(profileKey(KEY),JSON.stringify(p));if(kind==='materials')queueProgress({kind,key:id,value});else window.dispatchEvent(new Event('py-term-progress'));return p;}
export function topicComplete(lesson:Lesson,study:StudyProgress,progress:Progress){return (lesson.resources?.length??0)>0 && lesson.resources!.every(r=>study.materials[`${lesson.id}:${r.id}`]) && (lesson.challenges||[]).every(c=>study.evidence[`${lesson.id}:${c.id}`]) && lessonStatus(lesson.id,lesson.tasks.map(t=>t.id),progress.tasks)==='done';}
export type Evidence={key:string;blob:Blob;name:string;savedAt:string};
export async function evidenceStore(key:string,value?:Evidence|null):Promise<Evidence|undefined>{
 const url=`/api/evidence?key=${encodeURIComponent(key)}`;
 if(value===undefined){const r=await fetch(url,{cache:'no-store'});if(r.status===404)return undefined;if(!r.ok)throw new Error('Не удалось загрузить скриншот');return {key,blob:await r.blob(),name:'Accepted',savedAt:''};}
 const r=await fetch(url,{method:value===null?'DELETE':'PUT',headers:{'X-Z2P-Profile':currentProfile()??'',...(value?{'Content-Type':value.blob.type}:{})},body:value?.blob});
 if(!r.ok)throw new Error('Не удалось сохранить скриншот');return undefined;
}
