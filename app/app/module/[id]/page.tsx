import { notFound } from "next/navigation";
import { modules } from "@/content/curriculum";
import { Roadmap } from "@/components/Roadmap";
export function generateStaticParams() { return modules.map(m=>({id:m.id})); }
export default async function ModulePage({params}:{params:Promise<{id:string}>}) { const {id}=await params; if(!modules.some(m=>m.id===id)) notFound(); return <Roadmap moduleId={id}/>; }
