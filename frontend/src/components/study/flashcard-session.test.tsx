import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { FlashcardSession } from "@/components/study/flashcard-session";
import {
  completedCount,
  initFlashcards,
  isFinished,
  rate,
  reveal,
} from "@/lib/flashcard-session";
import type { Vocabulary } from "@/types/api";

function vocab(term: string, extra: Partial<Vocabulary> = {}): Vocabulary {
  return {
    id: `id-${term}`,
    term,
    meaning: `nghĩa của ${term}`,
    reading: null,
    romanization: null,
    exampleSentence: null,
    exampleTranslation: null,
    notes: null,
    extra: null,
    language: { id: "ja", name: "Japanese", code: "ja" },
    level: null,
    collections: [],
    createdAt: "2026-10-06",
    updatedAt: "2026-10-06",
    ...extra,
  };
}

const CARDS = [
  vocab("食べる", {
    reading: "たべる",
    romanization: "taberu",
    exampleSentence: "毎日ご飯を食べます。",
    exampleTranslation: "Tôi ăn cơm mỗi ngày.",
  }),
  vocab("飲む"),
  vocab("行く"),
];

const term = () => screen.getByTestId("card-term").textContent;

describe("logic phiên flashcard (hàm thuần)", () => {
  it("chưa lật thì không chấm được", () => {
    const state = initFlashcards(["a", "b"]);
    expect(rate(state, "GOOD")).toBe(state);
  });

  it("GOOD/HARD/EASY bỏ thẻ khỏi hàng đợi và úp thẻ kế tiếp", () => {
    let state = reveal(initFlashcards(["a", "b", "c"]));
    state = rate(state, "GOOD");
    expect(state).toMatchObject({ queue: ["b", "c"], revealed: false });
    state = rate(reveal(state), "HARD");
    state = rate(reveal(state), "EASY");
    expect(isFinished(state)).toBe(true);
    expect(state.counts).toEqual({ AGAIN: 0, HARD: 1, GOOD: 1, EASY: 1 });
    expect(completedCount(state)).toBe(3);
  });

  it("AGAIN đưa thẻ về CUỐI hàng đợi và không tính là xong", () => {
    let state = reveal(initFlashcards(["a", "b", "c"]));
    state = rate(state, "AGAIN");
    expect(state.queue).toEqual(["b", "c", "a"]);
    expect(completedCount(state)).toBe(0);
    expect(state.total).toBe(3);
  });

  it("AGAIN trên thẻ cuối cùng → vẫn là thẻ đó, đã úp lại", () => {
    let state = reveal(initFlashcards(["a"]));
    state = rate(state, "AGAIN");
    expect(state).toMatchObject({ queue: ["a"], revealed: false });
    expect(isFinished(state)).toBe(false);
  });

  it("reveal hai lần hoặc trên phiên rỗng không đổi gì", () => {
    const revealed = reveal(initFlashcards(["a"]));
    expect(reveal(revealed)).toBe(revealed);
    const empty = initFlashcards<string>([]);
    expect(reveal(empty)).toBe(empty);
    expect(isFinished(empty)).toBe(true);
  });
});

describe("FlashcardSession", () => {
  it("mặt trước chỉ có từ; Space lật ra đủ cách đọc, nghĩa, ví dụ", async () => {
    const user = userEvent.setup();
    render(<FlashcardSession items={CARDS} onRestart={vi.fn()} />);

    expect(term()).toBe("食べる");
    expect(screen.queryByTestId("card-back")).toBeNull();
    expect(screen.queryByText("nghĩa của 食べる")).toBeNull();

    await user.keyboard(" ");

    const back = screen.getByTestId("card-back");
    expect(back).toHaveTextContent("たべる · taberu");
    expect(back).toHaveTextContent("nghĩa của 食べる");
    expect(back).toHaveTextContent("毎日ご飯を食べます。");
    expect(back).toHaveTextContent("Tôi ăn cơm mỗi ngày.");
  });

  it("phím số trước khi lật không có tác dụng", async () => {
    const onReview = vi.fn();
    const user = userEvent.setup();
    render(
      <FlashcardSession
        items={CARDS}
        onReview={onReview}
        onRestart={vi.fn()}
      />,
    );

    await user.keyboard("3");

    expect(term()).toBe("食べる");
    expect(onReview).not.toHaveBeenCalled();
  });

  it("học hết phiên chỉ bằng bàn phím; thẻ Again xuất hiện lại ở cuối", async () => {
    const onReview = vi.fn();
    const user = userEvent.setup();
    render(
      <FlashcardSession
        items={CARDS}
        onReview={onReview}
        onRestart={vi.fn()}
      />,
    );

    await user.keyboard(" 1"); // 食べる → Again
    expect(term()).toBe("飲む");
    expect(screen.queryByTestId("card-back")).toBeNull();
    await user.keyboard(" 3"); // 飲む → Good
    expect(term()).toBe("行く");
    await user.keyboard(" 4"); // 行く → Easy
    expect(term()).toBe("食べる"); // thẻ Again quay lại
    await user.keyboard(" 2"); // 食べる → Hard

    const summary = screen.getByRole("status");
    expect(summary).toHaveTextContent("Bạn đã học 3 thẻ");
    expect(summary).toHaveTextContent("Quên1");
    expect(summary).toHaveTextContent("Khó1");
    expect(summary).toHaveTextContent("Được1");
    expect(summary).toHaveTextContent("Dễ1");
    expect(
      onReview.mock.calls.map(([v, r]) => [(v as Vocabulary).term, r]),
    ).toEqual([
      ["食べる", "AGAIN"],
      ["飲む", "GOOD"],
      ["行く", "EASY"],
      ["食べる", "HARD"],
    ]);
  });

  it("bấm chuột cũng học được: Hiện đáp án → nút chấm", async () => {
    const user = userEvent.setup();
    render(
      <FlashcardSession items={[CARDS[1] as Vocabulary]} onRestart={vi.fn()} />,
    );

    expect(screen.queryByRole("button", { name: /Được/ })).toBeNull();
    await user.click(screen.getByRole("button", { name: /Hiện đáp án/ }));
    await user.click(screen.getByRole("button", { name: /Được/ }));

    expect(screen.getByRole("status")).toHaveTextContent("Bạn đã học 1 thẻ");
  });

  it("phím tắt không kích hoạt khi đang giữ Ctrl", async () => {
    const user = userEvent.setup();
    render(<FlashcardSession items={CARDS} onRestart={vi.fn()} />);

    await user.keyboard("{Control>} {/Control}");

    expect(screen.queryByTestId("card-back")).toBeNull();
  });

  it("màn tổng kết: “Học phiên mới” gọi onRestart", async () => {
    const onRestart = vi.fn();
    const user = userEvent.setup();
    render(
      <FlashcardSession
        items={[CARDS[1] as Vocabulary]}
        onRestart={onRestart}
      />,
    );

    await user.keyboard(" 3");
    await user.click(screen.getByRole("button", { name: "Học phiên mới" }));

    expect(onRestart).toHaveBeenCalledTimes(1);
  });
});
