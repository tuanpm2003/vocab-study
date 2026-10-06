import { act, fireEvent, render, screen } from "@testing-library/react";
import { useState } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  SEARCH_DEBOUNCE_MS,
  SearchInput,
} from "@/components/vocabulary/search-input";

/** Giả lập trang cha: giữ `value` giống như URL giữ tham số search. */
function Harness({ onChange }: { onChange: (value: string) => void }) {
  const [value, setValue] = useState("");
  return (
    <>
      <SearchInput
        value={value}
        onChange={(next) => {
          onChange(next);
          setValue(next);
        }}
      />
      <button type="button" onClick={() => setValue("")}>
        Xóa bộ lọc
      </button>
      <button type="button" onClick={() => setValue("từ URL")}>
        Back
      </button>
    </>
  );
}

const input = () => screen.getByRole<HTMLInputElement>("searchbox");
const type = (text: string) =>
  fireEvent.change(input(), { target: { value: text } });
function wait(ms: number): void {
  act(() => {
    vi.advanceTimersByTime(ms);
  });
}

beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

describe("SearchInput", () => {
  it("gõ nhanh nhiều ký tự → chỉ báo ra MỘT lần, sau khi ngừng 300ms", () => {
    const onChange = vi.fn();
    render(<Harness onChange={onChange} />);

    for (const text of ["t", "ta", "tab", "tabe", "taber"]) {
      type(text);
      wait(SEARCH_DEBOUNCE_MS - 50);
    }
    expect(onChange).not.toHaveBeenCalled();

    wait(50);
    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange).toHaveBeenCalledWith("taber");
  });

  it("sau khi debounce chạy, ô KHÔNG bị dựng lại: vẫn giữ focus và gõ tiếp được", () => {
    const onChange = vi.fn();
    render(<Harness onChange={onChange} />);
    const element = input();
    element.focus();

    type("ta");
    wait(SEARCH_DEBOUNCE_MS);

    // Cùng một phần tử DOM — nếu bị remount thì đây là phần tử khác và focus đã mất.
    expect(input()).toBe(element);
    expect(element).toHaveFocus();

    type("taberu");
    wait(SEARCH_DEBOUNCE_MS);
    expect(onChange).toHaveBeenLastCalledWith("taberu");
    expect(element).toHaveValue("taberu");
  });

  it("ký tự gõ thêm trong lúc giá trị cũ đang dội về không bị ghi đè", () => {
    const onChange = vi.fn();
    render(<Harness onChange={onChange} />);

    type("ta");
    wait(SEARCH_DEBOUNCE_MS);
    type("tab");

    expect(input()).toHaveValue("tab");
    wait(SEARCH_DEBOUNCE_MS);
    expect(onChange).toHaveBeenLastCalledWith("tab");
  });

  it("giá trị đổi từ bên ngoài (Xóa bộ lọc, Back) được chép vào ô và không báo ngược ra", () => {
    const onChange = vi.fn();
    render(<Harness onChange={onChange} />);
    type("ta");
    wait(SEARCH_DEBOUNCE_MS);
    onChange.mockClear();

    fireEvent.click(screen.getByRole("button", { name: "Xóa bộ lọc" }));
    expect(input()).toHaveValue("");

    fireEvent.click(screen.getByRole("button", { name: "Back" }));
    expect(input()).toHaveValue("từ URL");

    wait(SEARCH_DEBOUNCE_MS * 2);
    expect(onChange).not.toHaveBeenCalled();
  });

  it("khoảng trắng đầu cuối bị bỏ; chỉ gõ khoảng trắng thì không báo gì", () => {
    const onChange = vi.fn();
    render(<Harness onChange={onChange} />);

    type("   ");
    wait(SEARCH_DEBOUNCE_MS);
    expect(onChange).not.toHaveBeenCalled();

    type("  ăn ");
    wait(SEARCH_DEBOUNCE_MS);
    expect(onChange).toHaveBeenCalledWith("ăn");
  });
});
