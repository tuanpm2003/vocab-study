import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AuthForm } from "@/components/auth/auth-form";
import { AuthGate } from "@/components/auth/auth-gate";
import { authApi } from "@/lib/api";
import { ApiError } from "@/lib/api-client";
import { renderWithQuery } from "@/test/render";
import type { AuthResponse, User } from "@/types/api";

vi.mock("@/lib/api", () => ({
  authApi: { me: vi.fn(), login: vi.fn(), register: vi.fn(), logout: vi.fn() },
}));

const router = vi.hoisted(() => ({ replace: vi.fn(), push: vi.fn() }));
const location = vi.hoisted(() => ({ pathname: "/login", search: "" }));
vi.mock("next/navigation", () => ({
  useRouter: () => router,
  usePathname: () => location.pathname,
  useSearchParams: () => new URLSearchParams(location.search),
}));

const toast = vi.hoisted(() => ({ success: vi.fn(), error: vi.fn() }));
vi.mock("sonner", () => ({ toast }));

// Giá trị chỉ dùng trong test — không phải mật khẩu của tài khoản nào.
const PASSWORD = "mat-khau-test-1";

const USER: User = {
  id: "user-1",
  email: "an@example.com",
  displayName: "An",
  createdAt: "2026-10-07",
};
const SIGNED_IN: AuthResponse = { user: USER, claimedExistingData: false };
const unauthorized = () => new ApiError(401, "Bạn cần đăng nhập");

const email = () => screen.getByLabelText("Email");
const password = () => screen.getByLabelText("Mật khẩu");

beforeEach(() => {
  vi.clearAllMocks();
  location.pathname = "/login";
  location.search = "";
  vi.mocked(authApi.me).mockRejectedValue(unauthorized());
});

describe("AuthForm — đăng nhập", () => {
  it("đăng nhập đúng → gọi API với email + mật khẩu, rồi vào trang chủ", async () => {
    vi.mocked(authApi.login).mockResolvedValue(SIGNED_IN);
    const user = userEvent.setup();
    renderWithQuery(<AuthForm mode="login" />);

    await user.type(email(), "an@example.com");
    await user.type(password(), `${PASSWORD}{Enter}`);

    await waitFor(() => expect(router.replace).toHaveBeenCalledWith("/"));
    expect(authApi.login).toHaveBeenCalledWith({
      email: "an@example.com",
      password: PASSWORD,
    });
  });

  it("có ?next= → đăng nhập xong quay lại đúng trang đó", async () => {
    location.search = "?next=%2Fvocabulary%3Fstatus%3DNEW";
    vi.mocked(authApi.login).mockResolvedValue(SIGNED_IN);
    const user = userEvent.setup();
    renderWithQuery(<AuthForm mode="login" />);

    await user.type(email(), "an@example.com");
    await user.type(password(), `${PASSWORD}{Enter}`);

    await waitFor(() =>
      expect(router.replace).toHaveBeenCalledWith("/vocabulary?status=NEW"),
    );
  });

  it("?next= trỏ ra trang ngoài → bị bỏ qua, về trang chủ (chống open redirect)", async () => {
    location.search = "?next=https%3A%2F%2Ftrang-gia-mao.example";
    vi.mocked(authApi.login).mockResolvedValue(SIGNED_IN);
    const user = userEvent.setup();
    renderWithQuery(<AuthForm mode="login" />);

    await user.type(email(), "an@example.com");
    await user.type(password(), `${PASSWORD}{Enter}`);

    await waitFor(() => expect(router.replace).toHaveBeenCalledWith("/"));
    expect(router.replace).not.toHaveBeenCalledWith(
      expect.stringContaining("trang-gia-mao"),
    );
  });

  it("sai mật khẩu → hiện lỗi của backend, xóa ô mật khẩu, giữ email", async () => {
    vi.mocked(authApi.login).mockRejectedValue(
      new ApiError(401, "Email hoặc mật khẩu không đúng"),
    );
    const user = userEvent.setup();
    renderWithQuery(<AuthForm mode="login" />);

    await user.type(email(), "an@example.com");
    await user.type(password(), `${PASSWORD}{Enter}`);

    expect(
      await screen.findByText("Email hoặc mật khẩu không đúng"),
    ).toBeInTheDocument();
    expect(password()).toHaveValue("");
    expect(email()).toHaveValue("an@example.com");
    expect(router.replace).not.toHaveBeenCalled();
  });

  it("bị giới hạn tần suất (429) → lời nhắc dễ hiểu", async () => {
    vi.mocked(authApi.login).mockRejectedValue(
      new ApiError(429, "ThrottlerException: Too Many Requests"),
    );
    const user = userEvent.setup();
    renderWithQuery(<AuthForm mode="login" />);

    await user.type(email(), "an@example.com");
    await user.type(password(), `${PASSWORD}{Enter}`);

    expect(
      await screen.findByText(/thử quá nhiều lần\. Chờ một phút/),
    ).toBeInTheDocument();
  });

  it("bỏ trống → báo lỗi tại ô, không gọi API", async () => {
    const user = userEvent.setup();
    renderWithQuery(<AuthForm mode="login" />);

    await user.click(screen.getByRole("button", { name: "Đăng nhập" }));

    expect(await screen.findByText("Nhập email")).toBeInTheDocument();
    expect(screen.getByText("Nhập mật khẩu")).toBeInTheDocument();
    expect(authApi.login).not.toHaveBeenCalled();
  });

  it("mật khẩu có khoảng trắng đầu/cuối được gửi nguyên vẹn, không bị cắt", async () => {
    vi.mocked(authApi.login).mockResolvedValue(SIGNED_IN);
    const user = userEvent.setup();
    renderWithQuery(<AuthForm mode="login" />);

    await user.type(email(), "  an@example.com ");
    await user.type(password(), ` ${PASSWORD} {Enter}`);

    await waitFor(() => expect(authApi.login).toHaveBeenCalled());
    expect(authApi.login).toHaveBeenCalledWith({
      email: "an@example.com",
      password: ` ${PASSWORD} `,
    });
  });

  it("ô mật khẩu là type=password và có gợi ý cho trình quản lý mật khẩu", () => {
    renderWithQuery(<AuthForm mode="login" />);

    expect(password()).toHaveAttribute("type", "password");
    expect(password()).toHaveAttribute("autocomplete", "current-password");
  });

  it("đã đăng nhập sẵn mà mở /login → đi thẳng vào app", async () => {
    vi.mocked(authApi.me).mockResolvedValue(USER);
    location.search = "?next=%2Fstudy";
    renderWithQuery(<AuthForm mode="login" />);

    await waitFor(() => expect(router.replace).toHaveBeenCalledWith("/study"));
  });
});

describe("AuthForm — đăng ký", () => {
  it("mật khẩu ngắn hơn 8 ký tự → báo lỗi, không gọi API", async () => {
    const user = userEvent.setup();
    renderWithQuery(<AuthForm mode="register" />);

    await user.type(email(), "an@example.com");
    await user.type(password(), "1234567{Enter}");

    expect(
      await screen.findByText("Mật khẩu cần ít nhất 8 ký tự"),
    ).toBeInTheDocument();
    expect(authApi.register).not.toHaveBeenCalled();
  });

  it("đăng ký thành công → gửi tên hiển thị (rỗng thành null), vào app", async () => {
    vi.mocked(authApi.register).mockResolvedValue(SIGNED_IN);
    const user = userEvent.setup();
    renderWithQuery(<AuthForm mode="register" />);

    await user.type(email(), "an@example.com");
    await user.type(password(), `${PASSWORD}{Enter}`);

    await waitFor(() => expect(router.replace).toHaveBeenCalledWith("/"));
    expect(authApi.register).toHaveBeenCalledWith({
      email: "an@example.com",
      password: PASSWORD,
      displayName: null,
    });
    expect(toast.success).not.toHaveBeenCalled();
    expect(password()).toHaveAttribute("autocomplete", "new-password");
  });

  it("tài khoản đầu tiên nhận dữ liệu cũ → có thông báo", async () => {
    vi.mocked(authApi.register).mockResolvedValue({
      user: USER,
      claimedExistingData: true,
    });
    const user = userEvent.setup();
    renderWithQuery(<AuthForm mode="register" />);

    await user.type(email(), "an@example.com");
    await user.type(password(), `${PASSWORD}{Enter}`);

    await waitFor(() =>
      expect(toast.success).toHaveBeenCalledWith(
        "Đã chuyển toàn bộ dữ liệu có sẵn vào tài khoản của bạn",
        expect.anything(),
      ),
    );
  });

  it("email đã đăng ký (409) → lỗi gắn vào ô email", async () => {
    vi.mocked(authApi.register).mockRejectedValue(
      new ApiError(409, "Email này đã được đăng ký"),
    );
    const user = userEvent.setup();
    renderWithQuery(<AuthForm mode="register" />);

    await user.type(email(), "an@example.com");
    await user.type(password(), `${PASSWORD}{Enter}`);

    expect(
      await screen.findByText("Email này đã được đăng ký"),
    ).toBeInTheDocument();
    expect(email()).toHaveAttribute("aria-invalid", "true");
  });

  it("link sang trang đăng nhập giữ nguyên ?next=", () => {
    location.search = "?next=%2Fvocabulary";
    renderWithQuery(<AuthForm mode="register" />);

    expect(screen.getByRole("link", { name: "Đăng nhập" })).toHaveAttribute(
      "href",
      "/login?next=%2Fvocabulary",
    );
  });
});

describe("AuthGate", () => {
  const page = () => (
    <AuthGate>{(user) => <p>Xin chào {user.email}</p>}</AuthGate>
  );

  it("đã đăng nhập → hiện nội dung, không chuyển hướng", async () => {
    vi.mocked(authApi.me).mockResolvedValue(USER);
    location.pathname = "/vocabulary";
    renderWithQuery(page());

    expect(
      await screen.findByText("Xin chào an@example.com"),
    ).toBeInTheDocument();
    expect(router.replace).not.toHaveBeenCalled();
  });

  it("chưa đăng nhập → về /login kèm trang đang mở, và KHÔNG render nội dung bên trong", async () => {
    location.pathname = "/vocabulary";
    window.history.replaceState(null, "", "/vocabulary?status=NEW");
    renderWithQuery(page());

    await waitFor(() =>
      expect(router.replace).toHaveBeenCalledWith(
        "/login?next=%2Fvocabulary%3Fstatus%3DNEW",
      ),
    );
    expect(screen.queryByText(/Xin chào/)).toBeNull();
    window.history.replaceState(null, "", "/");
  });

  it("backend không chạy → báo lỗi kết nối, không đẩy về trang đăng nhập", async () => {
    vi.mocked(authApi.me).mockRejectedValue(
      new ApiError(0, "Không kết nối được backend"),
    );
    location.pathname = "/vocabulary";
    renderWithQuery(page());

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Không kết nối được backend",
    );
    expect(router.replace).not.toHaveBeenCalled();
  });
});
