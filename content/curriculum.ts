import type { Lesson, Module } from '@/lib/types';
import course from './course.json';
import resources from './resources.json';
import taskGuides from './task-guides.json';
const guides = taskGuides as Record<string, {title:string;prompt:string;input:string;output:string;exampleText?:string;cases?:{input?:string;output?:string;text?:string}[];examples?:string[]}>;
import type { LearningResource, ExternalChallenge } from '@/lib/types';
const materials = resources as Record<string, {title?:string;resources:LearningResource[];challenges:ExternalChallenge[]}>;
export const modules: Module[] = course.modules;
export const lessons: Lesson[] = course.lessons.map(({markdown, ...lesson}) => ({...lesson, ...materials[lesson.id], tasks:lesson.tasks.map(task=>({...task,...guides[task.id]}))}));
export const lessonById: Record<string, Lesson> = Object.fromEntries(lessons.map(l => [l.id,l]));
export function allTaskKeys() { return lessons.flatMap(l => l.tasks.map(t => `${l.id}::${t.id}`)); }
