import {notFound} from 'next/navigation';
import {BookCourse} from '@/components/BookCourse';
import book from '@/content/book.json';
export function generateStaticParams(){return book.chapters.map(c=>({id:c.id}));}
export default async function Page({params}:{params:Promise<{id:string}>}){const {id}=await params;if(!book.chapters.some(c=>c.id===id))notFound();return <BookCourse chapterId={id}/>;}
