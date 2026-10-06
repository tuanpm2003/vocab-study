// Sinh câu trắc nghiệm. Hàm thuần: không database, không HTTP, nguồn ngẫu nhiên được truyền
// vào — nên test được MỌI nhánh với kết quả xác định.

export const QUESTION_TYPES = ['term_to_meaning', 'meaning_to_term'] as const;
/** term_to_meaning: cho từ, chọn nghĩa. meaning_to_term: cho nghĩa, chọn từ. */
export type QuestionType = (typeof QUESTION_TYPES)[number];

export const CHOICE_COUNT = 4;

export interface ChoiceSource {
  id: string;
  term: string;
  meaning: string;
}

export interface BuiltQuestion {
  questionType: QuestionType;
  prompt: string;
  choices: string[];
  correctIndex: number;
}

export type Random = () => number;

/** "Ăn" và " ăn " là cùng một đáp án đối với người học. */
export function normalize(text: string): string {
  return text.trim().toLocaleLowerCase();
}

/** Fisher–Yates. Trả mảng mới, không sửa mảng gốc. */
export function shuffle<T>(items: readonly T[], random: Random): T[] {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    const a = result[i] as T;
    result[i] = result[j] as T;
    result[j] = a;
  }
  return result;
}

/**
 * Dựng một câu hỏi 4 lựa chọn cho `target`, lấy đáp án nhiễu từ `pool` (các từ CÙNG ngôn ngữ).
 * Trả `null` khi pool không đủ 3 đáp án nhiễu hợp lệ.
 *
 * Một từ trong pool bị loại nếu:
 *  - là chính `target`;
 *  - trùng NGHĨA với target → sẽ có hai lựa chọn giống hệt nhau, hoặc hai đáp án cùng đúng;
 *  - trùng MẶT CHỮ với target (行 "đi" / 行 "hàng") → nghĩa của nó cũng là một đáp án đúng
 *    cho câu "行 nghĩa là gì?", nên không thể dùng làm đáp án sai.
 * Các đáp án nhiễu cũng không được trùng nhau.
 */
export function buildQuestion(
  target: ChoiceSource,
  pool: readonly ChoiceSource[],
  questionType: QuestionType,
  random: Random = Math.random,
): BuiltQuestion | null {
  const answerOf = (source: ChoiceSource): string =>
    questionType === 'term_to_meaning' ? source.meaning : source.term;
  const targetTerm = normalize(target.term);
  const targetMeaning = normalize(target.meaning);

  const used = new Set<string>([normalize(answerOf(target))]);
  const distractors: string[] = [];
  for (const candidate of shuffle(pool, random)) {
    if (distractors.length === CHOICE_COUNT - 1) break;
    if (candidate.id === target.id) continue;
    if (normalize(candidate.term) === targetTerm) continue;
    if (normalize(candidate.meaning) === targetMeaning) continue;
    const answer = answerOf(candidate);
    if (used.has(normalize(answer))) continue;
    used.add(normalize(answer));
    distractors.push(answer);
  }
  if (distractors.length < CHOICE_COUNT - 1) return null;

  const correct = answerOf(target);
  // Xáo vị trí: nếu đáp án đúng luôn ở ô đầu, người học sẽ thuộc vị trí chứ không thuộc từ.
  const choices = shuffle([correct, ...distractors], random);
  return {
    questionType,
    prompt: questionType === 'term_to_meaning' ? target.term : target.meaning,
    choices,
    correctIndex: choices.indexOf(correct),
  };
}
