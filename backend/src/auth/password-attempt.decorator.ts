import { SetMetadata, type ExecutionContext } from '@nestjs/common';

const PASSWORD_ATTEMPT = 'passwordAttempt';

/**
 * Đánh dấu route nhận mật khẩu. Chỉ những route này chịu giới hạn chặt
 * AUTH_RATE_LIMIT_PER_MINUTE; mọi route khác chỉ chịu giới hạn chung của API.
 */
export const PasswordAttempt = () => SetMetadata(PASSWORD_ATTEMPT, true);

export function isPasswordAttempt(context: ExecutionContext): boolean {
  return Reflect.getMetadata(PASSWORD_ATTEMPT, context.getHandler()) === true;
}
