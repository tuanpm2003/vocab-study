import { NEW_PROGRESS } from "@/test/factories";
import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { VocabularyForm } from "@/components/vocabulary/vocabulary-form";
import { collectionsApi, languagesApi, vocabulariesApi } from "@/lib/api";
import { loadContext } from "@/lib/vocabulary-context";
import { renderWithQuery } from "@/test/render";
import type {
  Collection,
  CreatedVocabulary,
  Language,
  LanguageDetail,
  Vocabulary,
} from "@/types/api";

vi.mock("@/lib/api", () => ({
  languagesApi: { list: vi.fn(), get: vi.fn() },
  collectionsApi: { listByLanguage: vi.fn() },
  vocabulariesApi: { create: vi.fn(), update: vi.fn() },
}));

const toast = vi.hoisted(() => ({
  success: vi.fn(),
  warning: vi.fn(),
  error: vi.fn(),
}));
vi.mock("sonner", () => ({ toast }));

const stamp = { createdAt: "2026-10-06", updatedAt: "2026-10-06" };

const japanese: Language = {
  id: "ja",
  name: "Japanese",
  code: "ja",
  vocabularyCount: 0,
  ...stamp,
};
const chinese: Language = {
  ...japanese,
  id: "zh",
  name: "Chinese",
  code: "zh",
};
const english: Language = {
  ...japanese,
  id: "en",
  name: "English",
  code: "en",
};

function detail(language: Language, levels: string[]): LanguageDetail {
  return {
    ...language,
    levelSystems: [
      {
        id: `${language.id}-sys`,
        languageId: language.id,
        name: "System",
        isDefault: true,
        levels: levels.map((name, index) => ({
          id: `${language.id}-${name}`,
          levelSystemId: `${language.id}-sys`,
          name,
          order: index + 1,
        })),
      },
    ],
  };
}

function collection(
  language: Language,
  id: string,
  name: string,
  levelId: string | null,
): Collection {
  return {
    id,
    name,
    languageId: language.id,
    language: { id: language.id, name: language.name },
    levelId,
    level: null,
    kind: levelId ? "LESSON" : "TOPIC",
    description: null,
    vocabularyCount: 0,
    ...stamp,
  };
}

const COLLECTIONS: Record<string, Collection[]> = {
  ja: [
    collection(japanese, "ja-l3", "Lesson 3", "ja-N5"),
    collection(japanese, "ja-n4l1", "N4 Lesson 1", "ja-N4"),
    collection(japanese, "ja-food", "Food", null),
  ],
  zh: [collection(chinese, "zh-l1", "Bài 1", "zh-HSK 1")],
  en: [],
};

function saved(term: string, extra: Partial<CreatedVocabulary> = {}) {
  return {
    id: `id-${term}`,
    term,
    meaning: "x",
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
    ...stamp,
    ...extra,
  } satisfies CreatedVocabulary;
}

const JA_CONTEXT = {
  languageId: "ja",
  levelId: "ja-N5",
  collectionIds: ["ja-l3"],
};

const termInput = () => screen.getByLabelText("Từ");
const meaningInput = () => screen.getByLabelText("Nghĩa");
const languageSelect = () =>
  screen.getByLabelText<HTMLSelectElement>("Ngôn ngữ");
const levelSelect = () => screen.getByLabelText<HTMLSelectElement>("Level");
const chip = (name: string) => screen.findByRole("button", { name });

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(languagesApi.list).mockResolvedValue({
    items: [chinese, english, japanese],
    total: 3,
    page: 1,
    limit: 100,
    totalPages: 1,
  });
  vi.mocked(languagesApi.get).mockImplementation((id) =>
    Promise.resolve(
      id === "ja"
        ? detail(japanese, ["N5", "N4"])
        : id === "zh"
          ? detail(chinese, ["HSK 1"])
          : detail(english, ["B1"]),
    ),
  );
  vi.mocked(collectionsApi.listByLanguage).mockImplementation((id) => {
    const items = COLLECTIONS[id] ?? [];
    return Promise.resolve({
      items,
      total: items.length,
      page: 1,
      limit: 100,
      totalPages: 1,
    });
  });
  vi.mocked(vocabulariesApi.create).mockImplementation((input) =>
    Promise.resolve(saved(input.term)),
  );
});

describe("VocabularyForm — thêm từ nhanh", () => {
  it("lưu xong: giữ Language/Level/Collection, xóa các ô còn lại, con trỏ về ô Từ", async () => {
    const user = userEvent.setup();
    renderWithQuery(<VocabularyForm initialContext={JA_CONTEXT} />);
    await chip("Lesson 3");

    await user.type(termInput(), "食べる");
    await user.type(meaningInput(), "ăn");
    await user.type(screen.getByLabelText("Kana"), "たべる");
    await user.click(screen.getByRole("button", { name: "Lưu" }));

    await waitFor(() => expect(termInput()).toHaveValue(""));
    expect(vocabulariesApi.create).toHaveBeenCalledWith({
      languageId: "ja",
      levelId: "ja-N5",
      collectionIds: ["ja-l3"],
      term: "食べる",
      meaning: "ăn",
      reading: "たべる",
      romanization: null,
      exampleSentence: null,
      exampleTranslation: null,
      notes: null,
    });
    expect(meaningInput()).toHaveValue("");
    expect(screen.getByLabelText("Kana")).toHaveValue("");
    expect(languageSelect()).toHaveValue("ja");
    expect(levelSelect()).toHaveValue("ja-N5");
    expect(await chip("Lesson 3")).toHaveAttribute("aria-pressed", "true");
    expect(termInput()).toHaveFocus();
    expect(toast.success).toHaveBeenCalledWith("Đã lưu 食べる");
  });

  it("nhập liên tiếp 3 từ chỉ bằng bàn phím (Tab + Enter)", async () => {
    const user = userEvent.setup();
    renderWithQuery(<VocabularyForm initialContext={JA_CONTEXT} />);
    await chip("Lesson 3");
    termInput().focus();

    for (const [term, meaning] of [
      ["水", "nước"],
      ["魚", "cá"],
      ["行く", "đi"],
    ] as const) {
      await user.keyboard(`${term}{Tab}${meaning}{Enter}`);
      await waitFor(() => expect(termInput()).toHaveValue(""));
      expect(termInput()).toHaveFocus();
    }

    expect(
      vi.mocked(vocabulariesApi.create).mock.calls.map((c) => c[0].term),
    ).toEqual(["水", "魚", "行く"]);
    expect(screen.getByRole("status")).toHaveTextContent(
      "Đã thêm 3 từ trong lượt này",
    );
  });

  it("Ctrl+Enter lưu được ngay cả khi đang ở trong textarea", async () => {
    const user = userEvent.setup();
    renderWithQuery(<VocabularyForm initialContext={JA_CONTEXT} />);
    await chip("Lesson 3");

    await user.type(termInput(), "飲む");
    await user.type(meaningInput(), "uống");
    await user.type(screen.getByLabelText("Ghi chú"), "động từ nhóm 1");
    // Enter thường trong textarea chỉ xuống dòng, không được lưu.
    await user.keyboard("{Enter}");
    expect(vocabulariesApi.create).not.toHaveBeenCalled();

    await user.keyboard("{Control>}{Enter}{/Control}");

    await waitFor(() =>
      expect(vocabulariesApi.create).toHaveBeenCalledTimes(1),
    );
    await waitFor(() => expect(termInput()).toHaveFocus());
  });

  it("thiếu Từ hoặc Nghĩa → báo lỗi tại ô, không gọi API", async () => {
    const user = userEvent.setup();
    renderWithQuery(<VocabularyForm initialContext={JA_CONTEXT} />);
    await chip("Lesson 3");

    await user.click(screen.getByRole("button", { name: "Lưu" }));

    expect(
      await screen.findByText("Từ không được để trống"),
    ).toBeInTheDocument();
    expect(screen.getByText("Nghĩa không được để trống")).toBeInTheDocument();
    expect(vocabulariesApi.create).not.toHaveBeenCalled();
  });

  it("chưa chọn ngôn ngữ → không gọi API con, báo lỗi khi lưu", async () => {
    const user = userEvent.setup();
    renderWithQuery(<VocabularyForm />);
    await screen.findByRole("option", { name: "Japanese" });

    expect(languagesApi.get).not.toHaveBeenCalled();
    expect(collectionsApi.listByLanguage).not.toHaveBeenCalled();
    expect(levelSelect()).toBeDisabled();

    await user.type(termInput(), "x");
    await user.type(meaningInput(), "y");
    await user.click(screen.getByRole("button", { name: "Lưu" }));

    expect(await screen.findByText("Chọn ngôn ngữ trước")).toBeInTheDocument();
    expect(vocabulariesApi.create).not.toHaveBeenCalled();
  });

  it("lỗi từ backend → hiện lỗi và GIỮ nguyên những gì đã gõ", async () => {
    vi.mocked(vocabulariesApi.create).mockRejectedValueOnce(
      new Error("Lỗi máy chủ"),
    );
    const user = userEvent.setup();
    renderWithQuery(<VocabularyForm initialContext={JA_CONTEXT} />);
    await chip("Lesson 3");

    await user.type(termInput(), "食べる");
    await user.type(meaningInput(), "ăn");
    await user.click(screen.getByRole("button", { name: "Lưu" }));

    expect(await screen.findByText("Lỗi máy chủ")).toBeInTheDocument();
    expect(termInput()).toHaveValue("食べる");
    expect(meaningInput()).toHaveValue("ăn");
  });
});

describe("VocabularyForm — dropdown phụ thuộc nhau", () => {
  it("đổi ngôn ngữ → level và collection nạp lại, lựa chọn cũ bị bỏ", async () => {
    const user = userEvent.setup();
    renderWithQuery(<VocabularyForm initialContext={JA_CONTEXT} />);
    await chip("Lesson 3");
    await screen.findByRole("option", { name: "Chinese" });

    await user.selectOptions(languageSelect(), "zh");

    expect(await chip("Bài 1")).toHaveAttribute("aria-pressed", "false");
    expect(screen.queryByRole("button", { name: "Lesson 3" })).toBeNull();
    expect(levelSelect()).toHaveValue("");
    expect(
      within(levelSelect()).getByRole("option", { name: "HSK 1" }),
    ).toBeInTheDocument();
    expect(languagesApi.get).toHaveBeenLastCalledWith("zh");
    for (const call of vi.mocked(languagesApi.get).mock.calls) {
      expect(call[0]).toMatch(/^(ja|zh)$/);
    }
  });

  it("chọn level → chỉ hiện bài học của level đó + chủ đề xuyên level", async () => {
    const user = userEvent.setup();
    renderWithQuery(
      <VocabularyForm
        initialContext={{ languageId: "ja", levelId: "", collectionIds: [] }}
      />,
    );
    await chip("N4 Lesson 1");
    await within(levelSelect()).findByRole("option", { name: "N5" });

    await user.selectOptions(levelSelect(), "ja-N5");

    expect(await chip("Lesson 3")).toBeInTheDocument();
    expect(await chip("Food")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "N4 Lesson 1" })).toBeNull();
  });

  it("chọn được nhiều collection cho một từ (quan hệ N-N)", async () => {
    const user = userEvent.setup();
    renderWithQuery(<VocabularyForm initialContext={JA_CONTEXT} />);

    await user.click(await chip("Food"));
    await user.type(termInput(), "食べる");
    await user.type(meaningInput(), "ăn");
    await user.click(screen.getByRole("button", { name: "Lưu" }));

    await waitFor(() =>
      expect(vocabulariesApi.create).toHaveBeenCalledWith(
        expect.objectContaining({ collectionIds: ["ja-l3", "ja-food"] }),
      ),
    );
  });

  it("nhãn ô đổi theo ngôn ngữ: ja → Kana/Romaji, zh → Pinyin, en → IPA và ẩn romanization", async () => {
    const user = userEvent.setup();
    renderWithQuery(<VocabularyForm initialContext={JA_CONTEXT} />);
    await screen.findByRole("option", { name: "Chinese" });

    expect(await screen.findByLabelText("Kana")).toBeInTheDocument();
    expect(screen.getByLabelText("Romaji")).toBeInTheDocument();

    await user.selectOptions(languageSelect(), "zh");
    expect(await screen.findByLabelText("Pinyin")).toBeInTheDocument();

    await user.selectOptions(languageSelect(), "en");
    expect(await screen.findByLabelText("Phiên âm (IPA)")).toBeInTheDocument();
    expect(screen.queryByLabelText("Romaji")).toBeNull();
    expect(screen.queryByLabelText("Pinyin không dấu")).toBeNull();
  });

  it("ngữ cảnh nhớ từ trước trỏ tới thứ đã bị xóa → tự dọn, không gửi id chết", async () => {
    renderWithQuery(
      <VocabularyForm
        initialContext={{
          languageId: "ja",
          levelId: "level-da-xoa",
          collectionIds: ["ja-l3", "collection-da-xoa"],
        }}
      />,
    );

    await waitFor(() => expect(levelSelect()).toHaveValue(""));
    await waitFor(() =>
      expect(loadContext()).toEqual({
        languageId: "ja",
        levelId: "",
        collectionIds: ["ja-l3"],
      }),
    );
  });

  it("ngôn ngữ đã nhớ không còn tồn tại → quay về chưa chọn", async () => {
    renderWithQuery(
      <VocabularyForm
        initialContext={{
          languageId: "da-xoa",
          levelId: "",
          collectionIds: [],
        }}
      />,
    );

    await waitFor(() => expect(languageSelect()).toHaveValue(""));
  });
});

describe("VocabularyForm — ghi nhớ và cảnh báo", () => {
  it("lưu ngữ cảnh vào localStorage ngay khi chọn", async () => {
    const user = userEvent.setup();
    renderWithQuery(<VocabularyForm />);
    await screen.findByRole("option", { name: "Japanese" });

    await user.selectOptions(languageSelect(), "ja");
    await user.click(await chip("Food"));

    await waitFor(() =>
      expect(loadContext()).toEqual({
        languageId: "ja",
        levelId: "",
        collectionIds: ["ja-food"],
      }),
    );
  });

  it("từ trùng → toast cảnh báo có link tới từ cũ, form vẫn sẵn sàng cho từ tiếp theo", async () => {
    vi.mocked(vocabulariesApi.create).mockResolvedValueOnce(
      saved("行", {
        warnings: [
          {
            code: "POSSIBLE_DUPLICATE",
            message: "Từ này đã có trong Lesson 1",
            existingIds: ["old-1"],
          },
        ],
      }),
    );
    const user = userEvent.setup();
    renderWithQuery(<VocabularyForm initialContext={JA_CONTEXT} />);
    await chip("Lesson 3");

    await user.type(termInput(), "行");
    await user.type(meaningInput(), "hàng");
    await user.keyboard("{Enter}");

    await waitFor(() => expect(toast.warning).toHaveBeenCalledTimes(1));
    const [message, options] = toast.warning.mock.calls[0] as [
      string,
      { description: React.ReactElement<{ href: string }> },
    ];
    expect(message).toBe("Từ này đã có trong Lesson 1");
    expect(options.description.props.href).toBe("/vocabulary/old-1/edit");
    // Không chặn: từ vẫn được lưu và form đã trống, sẵn sàng nhập tiếp.
    expect(toast.success).toHaveBeenCalledWith("Đã lưu 行");
    expect(termInput()).toHaveValue("");
    expect(termInput()).toHaveFocus();
  });
});

describe("VocabularyForm — chế độ sửa", () => {
  const existing: Vocabulary = saved("食べる", {
    id: "voc-1",
    meaning: "ăn",
    reading: "たべる",
    level: { id: "ja-N5", name: "N5" },
    collections: [{ id: "ja-l3", name: "Lesson 3" }],
  });

  it("điền sẵn dữ liệu, khóa ngôn ngữ, gọi update với collection mới", async () => {
    vi.mocked(vocabulariesApi.update).mockResolvedValue(existing);
    const onSaved = vi.fn();
    const user = userEvent.setup();
    renderWithQuery(<VocabularyForm vocabulary={existing} onSaved={onSaved} />);

    expect(termInput()).toHaveValue("食べる");
    expect(languageSelect()).toBeDisabled();
    expect(await chip("Lesson 3")).toHaveAttribute("aria-pressed", "true");

    await user.clear(meaningInput());
    await user.type(meaningInput(), "ăn (cơm)");
    await user.click(await chip("Food"));
    await user.click(await chip("Lesson 3"));
    await user.click(screen.getByRole("button", { name: "Lưu thay đổi" }));

    await waitFor(() => expect(onSaved).toHaveBeenCalled());
    expect(vocabulariesApi.update).toHaveBeenCalledWith(
      "voc-1",
      expect.objectContaining({
        meaning: "ăn (cơm)",
        collectionIds: ["ja-food"],
        levelId: "ja-N5",
      }),
    );
    expect(vocabulariesApi.create).not.toHaveBeenCalled();
    // Sửa một từ không được ghi đè ngữ cảnh nhập liệu đã nhớ.
    expect(loadContext()).toBeNull();
  });
});
