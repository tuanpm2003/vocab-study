import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import type { Request } from 'express';
import { IS_PUBLIC_KEY } from './public.decorator.js';

export const ACCESS_TOKEN_COOKIE = 'access_token';

export interface RequestWithOwner extends Request {
  ownerId?: string;
}

export interface JwtPayload {
  /** id của User — chính là `ownerId` mà mọi service nhận qua @CurrentUser(). */
  sub: string;
}

/**
 * Guard toàn cục: xác định AI đang gọi API từ JWT trong cookie, rồi gắn `ownerId` vào request.
 * Thay cho OwnerGuard của MVP (vốn gán một hằng số từ .env). `@CurrentUser()` và mọi chữ ký
 * service giữ nguyên — đúng lời hứa của ADR-006.
 */
@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly jwt: JwtService,
    private readonly reflector: Reflector,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    const request = context.switchToHttp().getRequest<RequestWithOwner>();
    const cookies = request.cookies as Record<string, unknown> | undefined;
    const token = cookies?.[ACCESS_TOKEN_COOKIE];
    if (typeof token !== 'string' || token === '') {
      throw new UnauthorizedException('Bạn cần đăng nhập');
    }
    try {
      // verifyAsync kiểm cả chữ ký lẫn hạn dùng. Token bị sửa, hết hạn, hay ký bằng khóa
      // khác đều rơi vào catch.
      const payload = await this.jwt.verifyAsync<JwtPayload>(token);
      if (typeof payload.sub !== 'string' || payload.sub === '') {
        throw new Error('thiếu sub');
      }
      request.ownerId = payload.sub;
      return true;
    } catch {
      throw new UnauthorizedException(
        'Phiên đăng nhập không hợp lệ hoặc đã hết hạn',
      );
    }
  }
}
