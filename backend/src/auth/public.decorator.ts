import { SetMetadata } from '@nestjs/common';

export const IS_PUBLIC_KEY = 'isPublic';

/**
 * Đánh dấu một route KHÔNG cần đăng nhập.
 * JwtAuthGuard là guard toàn cục và mặc định khóa mọi thứ: quên gắn @Public() thì route bị
 * khóa nhầm (lộ ngay khi thử), còn nếu mặc định mở thì quên gắn guard là hở dữ liệu trong im lặng.
 */
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
