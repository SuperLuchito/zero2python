export type BookPart = {
  id: string;
  title: string;
  source: string;
  paragraphs: string[];
  questions: {
    prompt: string;
    choices: string[];
    answer: number;
    explanation: string;
  }[];
};
// Add only source-checked material from the supplied edition.
export const bookParts: BookPart[] = [];
export const demoParts: BookPart[] = [
  {
    id: "demo-interface",
    title: "Проверочный фрагмент",
    source: "Синтетический пример интерфейса. Не материал книги.",
    paragraphs: [
      "Условная система хранит два независимых показателя: прочитан ли фрагмент и как пройден тест. Отметка чтения не отвечает на вопросы теста.",
    ],
    questions: [
      {
        prompt: "Что означает отметка «Прочитано» в этом примере?",
        choices: ["Материал прочитан", "Все ответы верны"],
        answer: 0,
        explanation:
          "Отметка относится только к чтению. Повторите проверочный фрагмент.",
      },
      {
        prompt: "Сколько независимых показателей описано в примере?",
        choices: ["Один", "Два"],
        answer: 1,
        explanation:
          "Чтение и результат теста учитываются отдельно. Повторите проверочный фрагмент.",
      },
    ],
  },
];
export function quizScore(part: BookPart, answers: number[]) {
  return part.questions.filter((q, i) => answers[i] === q.answer).length;
}
