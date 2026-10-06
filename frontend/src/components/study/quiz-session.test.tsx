import { NEW_PROGRESS } from "@/test/factories";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { QuizSession } from "@/components/study/quiz-session";
import {
  answer,
  initQuiz,
  isQuizFinished,
  next,
  score,
} from "@/lib/quiz-session";
import type { QuizItem } from "@/types/api";

function item(
  term: string,
  meaning: string,
  choices: string[],
  correctIndex: number,
): QuizItem {
  return {
    vocabulary: {
      id: `id-${term}`,
      term,
      meaning,
      reading: null,
      romanization: null,
      exampleSentence: null,
      exampleTranslation: null,
      notes: null,
      extra: null,
      language: { id: "ja", name: "Japanese", code: "ja" },
      level: null,
      collections: [],
      progress: NEW_PROGRESS,
      createdAt: "2026-10-06",
      updatedAt: "2026-10-06",
    },
    questionType: "term_to_meaning",
    prompt: term,
    choices,
    correctIndex,
  };
}

const ITEMS = [
  item("食べる", "ăn", ["uống", "ăn", "đi", "nước"], 1),
  item("飲む", "uống", ["uống", "cá", "tôi", "đi"], 0),
  item("水", "nước", ["cá", "ăn", "tôi", "nước"], 3),
];

const prompt = () => screen.getByTestId("quiz-prompt").textContent;
const choice = (name: RegExp) => screen.getByRole("button", { name });

describe("logic phiên trắc nghiệm (hàm thuần)", () => {
  it("trả lời đúng/sai được ghi lại; trả lời lần hai bị bỏ qua", () => {
    let state = answer(initQuiz(ITEMS), 1);
    expect(state).toMatchObject({ selected: 1, results: [true] });
    expect(answer(state, 0)).toBe(state);

    state = answer(next(state), 2);
    expect(state.results).toEqual([true, false]);
  });

  it("chưa trả lời thì không sang câu được", () => {
    const state = initQuiz(ITEMS);
    expect(next(state)).toBe(state);
  });

  it("tổng kết: số đúng, số sai, danh sách câu sai", () => {
    let state = initQuiz(ITEMS);
    state = next(answer(state, 1)); // đúng
    state = next(answer(state, 3)); // sai
    state = next(answer(state, 0)); // sai

    expect(isQuizFinished(state)).toBe(true);
    const result = score(state);
    expect(result).toMatchObject({ correct: 1, incorrect: 2 });
    expect(result.missed.map((q) => q.vocabulary.term)).toEqual(["飲む", "水"]);
  });

  it("phiên rỗng là phiên đã xong, điểm 0/0", () => {
    const state = initQuiz<QuizItem>([]);
    expect(isQuizFinished(state)).toBe(true);
    expect(score(state)).toEqual({ correct: 0, incorrect: 0, missed: [] });
  });
});

describe("QuizSession", () => {
  it("làm hết bài chỉ bằng bàn phím; chọn sai thì hiện đáp án đúng", async () => {
    const onAnswer = vi.fn();
    const user = userEvent.setup();
    render(
      <QuizSession items={ITEMS} onAnswer={onAnswer} onRestart={vi.fn()} />,
    );

    expect(prompt()).toBe("食べる");
    await user.keyboard("2"); // đúng
    expect(screen.getByRole("status")).toHaveTextContent("Đúng!");
    expect(choice(/ăn/)).toHaveAttribute("data-state", "correct");

    await user.keyboard(" ");
    expect(prompt()).toBe("飲む");
    await user.keyboard("3"); // sai (chọn "tôi")
    expect(screen.getByRole("status")).toHaveTextContent(
      "Sai — đáp án đúng: uống",
    );
    expect(choice(/tôi/)).toHaveAttribute("data-state", "wrong");
    expect(choice(/uống/)).toHaveAttribute("data-state", "correct");

    await user.keyboard("{Enter}");
    expect(prompt()).toBe("水");
    await user.keyboard("4"); // đúng
    await user.keyboard(" ");

    const summary = screen.getByRole("status");
    expect(summary).toHaveTextContent("Đúng 2/3 câu (67%)");
    const missed = screen.getByRole("region", { name: "Các từ trả lời sai" });
    expect(within(missed).getByText("飲む")).toBeInTheDocument();
    expect(within(missed).queryByText("食べる")).toBeNull();
    expect(
      onAnswer.mock.calls.map(([v, ok]) => [(v as { term: string }).term, ok]),
    ).toEqual([
      ["食べる", true],
      ["飲む", false],
      ["水", true],
    ]);
  });

  it("đã trả lời thì phím số không đổi được đáp án và không ghi thêm kết quả", async () => {
    const onAnswer = vi.fn();
    const user = userEvent.setup();
    render(
      <QuizSession items={ITEMS} onAnswer={onAnswer} onRestart={vi.fn()} />,
    );

    await user.keyboard("1"); // sai
    await user.keyboard("2"); // cố sửa thành đúng

    expect(screen.getByRole("status")).toHaveTextContent("Sai");
    expect(onAnswer).toHaveBeenCalledTimes(1);
  });

  it("Space trước khi trả lời không bỏ qua câu hỏi", async () => {
    const user = userEvent.setup();
    render(<QuizSession items={ITEMS} onRestart={vi.fn()} />);

    await user.keyboard(" ");

    expect(prompt()).toBe("食べる");
  });

  it("bấm chuột: chọn đáp án rồi Tiếp", async () => {
    const user = userEvent.setup();
    render(<QuizSession items={[ITEMS[0] as QuizItem]} onRestart={vi.fn()} />);

    await user.click(choice(/ăn/));
    await user.click(screen.getByRole("button", { name: /Tiếp/ }));

    expect(screen.getByRole("status")).toHaveTextContent("Đúng 1/1 câu (100%)");
  });

  it("kiểu “chọn từ”: câu hỏi đổi chữ dẫn", () => {
    const termQuestion: QuizItem = {
      ...(ITEMS[0] as QuizItem),
      questionType: "meaning_to_term",
      prompt: "ăn",
      choices: ["飲む", "食べる", "水", "魚"],
    };
    render(<QuizSession items={[termQuestion]} onRestart={vi.fn()} />);

    expect(screen.getByText("Từ nào có nghĩa này?")).toBeInTheDocument();
    expect(prompt()).toBe("ăn");
  });
});

describe("QuizSession — phím tắt không tranh phím với nút đang focus", () => {
  it("Tab tới một đáp án rồi Enter: chọn đúng đáp án đó", async () => {
    const onAnswer = vi.fn();
    const user = userEvent.setup();
    render(
      <QuizSession
        items={[ITEMS[0] as QuizItem]}
        onAnswer={onAnswer}
        onRestart={vi.fn()}
      />,
    );

    await user.tab();
    await user.tab();
    expect(choice(/ăn/)).toHaveFocus();
    await user.keyboard("{Enter}");

    expect(onAnswer).toHaveBeenCalledTimes(1);
    expect(onAnswer.mock.calls[0]?.[1]).toBe(true);
  });

  it("màn tổng kết: Enter trên nút “Làm bài mới” bấm được nút", async () => {
    const onRestart = vi.fn();
    const user = userEvent.setup();
    render(
      <QuizSession items={[ITEMS[0] as QuizItem]} onRestart={onRestart} />,
    );
    await user.keyboard("2 ");
    expect(screen.getByRole("button", { name: "Làm bài mới" })).toHaveFocus();

    await user.keyboard("{Enter}");

    expect(onRestart).toHaveBeenCalledTimes(1);
  });
});
