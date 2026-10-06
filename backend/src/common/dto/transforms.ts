import type { TransformFnParams } from 'class-transformer';

/** " Japanese " và "Japanese" phải là một tên — nếu không, ràng buộc unique bị lách bằng dấu cách. */
export function trimString({ value }: TransformFnParams): unknown {
  return typeof value === 'string' ? value.trim() : value;
}

/** Chuỗi rỗng từ form nghĩa là "không có giá trị" — lưu null, không lưu "". */
export function emptyToNull({ value }: TransformFnParams): unknown {
  if (typeof value !== 'string') return value;
  const trimmed = value.trim();
  return trimmed === '' ? null : trimmed;
}

/** Dùng với @ValidateIf: chỉ bỏ qua validate khi field VẮNG MẶT, không bỏ qua khi là null. */
export function isPresent(_object: unknown, value: unknown): boolean {
  return value !== undefined;
}

/**
 * Trả lại giá trị GỐC client gửi, bỏ qua bước ép kiểu ngầm của ValidationPipe.
 * Bắt buộc cho field boolean: `enableImplicitConversion` ép `Boolean("false")` thành `true`
 * TRƯỚC khi @IsBoolean chạy, nên chuỗi "false" hay "yes" lọt qua và bị hiểu là true.
 */
export function rawValue({ obj, key }: TransformFnParams): unknown {
  return (obj as Record<string, unknown>)[key];
}
