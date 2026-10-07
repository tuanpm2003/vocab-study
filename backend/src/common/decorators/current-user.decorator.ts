import {
  createParamDecorator,
  ExecutionContext,
  InternalServerErrorException,
} from '@nestjs/common';
import type { RequestWithOwner } from '../../auth/jwt-auth.guard.js';

export function extractOwnerId(ctx: ExecutionContext): string {
  const { ownerId } = ctx.switchToHttp().getRequest<RequestWithOwner>();
  // Thiếu ownerId nghĩa là JwtAuthGuard không chạy (route @Public() mà lại dùng @CurrentUser). Thà lỗi 500 còn hơn chạy
  // một truy vấn không lọc theo owner.
  if (!ownerId) {
    throw new InternalServerErrorException('Không xác định được người dùng');
  }
  return ownerId;
}

export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): string => extractOwnerId(ctx),
);
