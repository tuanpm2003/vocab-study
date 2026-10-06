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
