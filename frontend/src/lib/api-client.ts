const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

/** Lỗi có cấu trúc từ backend, hoặc lỗi mạng (status = 0) khi không gọi được backend. */
export class ApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
    public readonly details?: unknown,
  ) {
    super(message);
    this.name = "ApiError";
  }

  get isNetworkError(): boolean {
    return this.status === 0;
  }
}

function extractMessage(body: unknown, fallback: string): string {
  if (typeof body === "object" && body !== null && "message" in body) {
    const { message } = body as { message: unknown };
    if (typeof message === "string") return message;
    // ValidationPipe trả message là mảng, mỗi phần tử một lỗi của một field.
    if (Array.isArray(message)) return message.join("; ");
  }
  return fallback;
}

export async function apiFetch<T>(
  path: string,
  init?: RequestInit,
): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${API_BASE_URL}${path}`, {
      ...init,
      headers: { "Content-Type": "application/json", ...init?.headers },
    });
  } catch (cause) {
    throw new ApiError(
      0,
      `Không kết nối được backend tại ${API_BASE_URL}. Backend đã chạy chưa?`,
      cause,
    );
  }

  if (!res.ok) {
    const body: unknown = await res.json().catch(() => null);
    throw new ApiError(res.status, extractMessage(body, res.statusText), body);
  }

  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}
