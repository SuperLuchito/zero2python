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
  starter: string;
  examples: string[];
  tests: string;
  hint: string;
  debrief: string;
};

export type Lesson = {
  id: string;
  title: string;
  module: string;
  minutes: number;
  needsPandas: boolean;
  body: string[];
  tasks: Task[];
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
