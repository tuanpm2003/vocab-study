// Logic của một phiên trắc nghiệm — hàm thuần, cùng kiểu với flashcard-session.ts.

export interface QuizState<T> {
  questions: T[];
  index: number;
  /** Lựa chọn của câu hiện tại; null = chưa trả lời. */
  selected: number | null;
  /** Kết quả từng câu ĐÃ trả lời, theo thứ tự. */
  results: boolean[];
}

export function initQuiz<T>(questions: T[]): QuizState<T> {
  return { questions, index: 0, selected: null, results: [] };
}

export function answer<T extends { correctIndex: number }>(
  state: QuizState<T>,
  choiceIndex: number,
): QuizState<T> {
  const question = state.questions[state.index];
  // Đã trả lời rồi thì không đổi được — nếu không, bấm lại sau khi thấy đáp án là "đúng" hết.
  if (!question || state.selected !== null) return state;
  return {
    ...state,
    selected: choiceIndex,
    results: [...state.results, choiceIndex === question.correctIndex],
  };
}

export function next<T>(state: QuizState<T>): QuizState<T> {
  if (state.selected === null) return state;
  return { ...state, index: state.index + 1, selected: null };
}

export function isQuizFinished<T>(state: QuizState<T>): boolean {
  return state.index >= state.questions.length;
}

export function score<T>(state: QuizState<T>): {
  correct: number;
  incorrect: number;
  /** Các câu trả lời sai, để ôn lại ở màn tổng kết. */
  missed: T[];
} {
  const missed = state.questions.filter((_, i) => state.results[i] === false);
  const correct = state.results.filter(Boolean).length;
  return { correct, incorrect: state.results.length - correct, missed };
}
