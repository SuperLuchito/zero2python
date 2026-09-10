export type TaskMark =
  | "untouched"
  | "hinted"
  | "solved"
  | "solved_hinted"
  | "gave_up";

export type Task = {
  id: string;
  title: string;
  prompt: string;
  input?: string;
  output?: string;
  exampleText?: string;
  cases?: {input?:string;output?:string;text?:string}[];
  starter: string;
  examples: string[];
  tests: string;
  hint: string;
  hints?: string[];
  solution?: string;
  debrief: string;
};

export type Lesson = {
  id: string;
  title: string;
  module: string;
  minutes: number;
  needsPandas: boolean;
  body: string[];
  markdown?: string;
  packages?: string[];
  notebook?: string;
  tasks: Task[];
  resources?: LearningResource[];
  challenges?: ExternalChallenge[];
};

export type Module = {
  id: string;
  title: string;
  blurb: string;
  lessonIds: string[];
};

export type Qotd = {
  id: string;
  title: string;
  prompt: string;
  choices: string[];
  answer: number;
  trap: string;
  debrief: string;
};

export type LearningResource = {
 id:string; title:string; url:string; kind:'video'|'article'; author:string;
 description:string; focus:string; checkedAt:string; youtubeId?:string; note?:string; companionUrl?:string;
};
export type ExternalChallenge = {id:string;title:string;url:string;difficulty:string;description:string;prerequisites:string;example?:string;};
