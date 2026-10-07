import { screen, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { Dashboard } from "@/components/dashboard/dashboard";
import { learningApi } from "@/lib/api";
import { ApiError } from "@/lib/api-client";
import { renderWithQuery } from "@/test/render";
import type { Stats } from "@/types/api";

vi.mock("@/lib/api", () => ({ learningApi: { stats: vi.fn() } }));

const EMPTY: Stats = {
  today: { reviewed: 0, correct: 0, incorrect: 0, accuracy: null },
  byLanguage: [],
  totals: {
    languages: 0,
    vocabulary: 0,
    new: 0,
    learning: 0,
    review: 0,
    mastered: 0,
  },
  dueCount: 0,
  streak: 0,
};

function stats(overrides: Partial<Stats>): Stats {
  return { ...EMPTY, ...overrides };
}

const currentStep = () =>
  screen
    .getAllByRole("listitem")
    .find((li) => li.getAttribute("aria-current") === "step");

beforeEach(() => vi.clearAllMocks());

describe("Dashboard — người dùng mới", () => {
  it("database rỗng → bước cần làm là thêm ngôn ngữ, và chỉ bước đó có nút", async () => {
    vi.mocked(learningApi.stats).mockResolvedValue(EMPTY);
    renderWithQuery(<Dashboard />);

    expect(await screen.findByText("Chào mừng")).toBeInTheDocument();
    const step = currentStep();
    expect(step).toHaveTextContent("Thêm ngôn ngữ bạn đang học");
    expect(
      within(step as HTMLElement).getByRole("link", { name: "Thêm ngôn ngữ" }),
    ).toHaveAttribute("href", "/languages");
    expect(screen.getAllByRole("link")).toHaveLength(1);
  });

  it("đã có ngôn ngữ nhưng chưa có từ → bước cần làm là thêm từ", async () => {
    vi.mocked(learningApi.stats).mockResolvedValue(
      stats({ totals: { ...EMPTY.totals, languages: 2 } }),
    );
    renderWithQuery(<Dashboard />);

    await screen.findByText("Chào mừng");
    const step = currentStep();
    expect(step).toHaveTextContent("Thêm vài từ đầu tiên");
    expect(
      within(step as HTMLElement).getByRole("link", { name: "Thêm từ" }),
    ).toHaveAttribute("href", "/vocabulary/new");
  });
});

describe("Dashboard — có dữ liệu", () => {
  const ACTIVE = stats({
    today: { reviewed: 8, correct: 6, incorrect: 2, accuracy: 0.75 },
    byLanguage: [
      {
        languageId: "ja",
        name: "Japanese",
        reviewed: 7,
        correct: 6,
        incorrect: 1,
      },
      {
        languageId: "zh",
        name: "Chinese",
        reviewed: 1,
        correct: 0,
        incorrect: 1,
      },
    ],
    totals: {
      languages: 2,
      vocabulary: 30,
      new: 20,
      learning: 6,
      review: 3,
      mastered: 1,
    },
    dueCount: 26,
    streak: 4,
  });

  it("hiện số hôm nay, theo ngôn ngữ, chuỗi ngày và kho từ theo trạng thái", async () => {
    vi.mocked(learningApi.stats).mockResolvedValue(ACTIVE);
    renderWithQuery(<Dashboard />);

    const today = await screen.findByRole("region", { name: "Hôm nay" });
    expect(today).toHaveTextContent("Đã ôn8");
    expect(today).toHaveTextContent("Đúng6");
    expect(today).toHaveTextContent("Sai2");
    expect(today).toHaveTextContent("Tỷ lệ đúng75%");
    expect(today).toHaveTextContent("Chuỗi 4 ngày liên tiếp");
    expect(today).toHaveTextContent("Japanese7 lượt · 6 đúng · 1 sai");

    const totals = screen.getByRole("region", { name: /Kho từ · 30 từ/ });
    expect(
      within(totals).getByRole("link", { name: /Đang học\s*6/ }),
    ).toHaveAttribute("href", "/vocabulary?status=LEARNING");
    expect(
      within(totals).getByRole("link", { name: /Mới\s*20/ }),
    ).toBeInTheDocument();
  });

  it("ba hành động chính luôn có mặt; Ôn tập nêu số từ cần ôn", async () => {
    vi.mocked(learningApi.stats).mockResolvedValue(ACTIVE);
    renderWithQuery(<Dashboard />);

    const actions = await screen.findByRole("region", {
      name: "Hành động chính",
    });
    expect(
      within(actions).getByRole("link", { name: /Ôn tập.*26 từ đến hạn ôn/ }),
    ).toHaveAttribute("href", "/study/session?source=due");
    expect(
      within(actions).getByRole("link", { name: /Thêm từ/ }),
    ).toHaveAttribute("href", "/vocabulary/new");
    expect(within(actions).getByRole("link", { name: /^Học/ })).toHaveAttribute(
      "href",
      "/study",
    );
  });

  it("chưa ôn hôm nay: tỷ lệ đúng là “—” (không phải 0%), có lời nhắc", async () => {
    vi.mocked(learningApi.stats).mockResolvedValue(
      stats({ totals: ACTIVE.totals, dueCount: 0 }),
    );
    renderWithQuery(<Dashboard />);

    const today = await screen.findByRole("region", { name: "Hôm nay" });
    expect(today).toHaveTextContent("Tỷ lệ đúng—");
    expect(today).not.toHaveTextContent("0%");
    expect(today).toHaveTextContent("Hôm nay bạn chưa ôn từ nào");
    expect(today).toHaveTextContent("Chưa có chuỗi ngày học");
    expect(
      screen.getByText("Hôm nay đã ôn hết — quay lại ngày mai"),
    ).toBeInTheDocument();
  });
});

describe("Dashboard — lỗi", () => {
  it("backend không chạy → báo lỗi dễ hiểu kèm cách khắc phục", async () => {
    vi.mocked(learningApi.stats).mockRejectedValue(
      new ApiError(0, "Không kết nối được backend"),
    );
    renderWithQuery(<Dashboard />);

    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent("Không kết nối được backend");
    expect(alert).toHaveTextContent("npm run start:dev");
  });
});
