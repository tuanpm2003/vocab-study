import "@testing-library/jest-dom/vitest";
import { cleanup, configure } from "@testing-library/react";
import { afterEach } from "vitest";

// Mặc định findBy*/waitFor chỉ chờ 1 giây. Máy đang bận (chạy song song nhiều file test) thì
// lần render đầu của một form lớn có thể lâu hơn thế và test đỏ oan.
configure({ asyncUtilTimeout: 4000 });

afterEach(() => {
  cleanup();
  window.localStorage.clear();
});
