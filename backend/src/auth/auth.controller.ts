import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Res,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ApiTags } from '@nestjs/swagger';
import type { CookieOptions, Response } from 'express';
import { CurrentUser } from '../common/decorators/current-user.decorator.js';
import type { EnvironmentVariables } from '../config/env.validation.js';
import { SESSION_TTL_SECONDS } from './auth.constants.js';
import { AuthService, type AuthResult } from './auth.service.js';
import { LoginDto, RegisterDto } from './dto/auth.dto.js';
import { ACCESS_TOKEN_COOKIE } from './jwt-auth.guard.js';
import { PasswordAttempt } from './password-attempt.decorator.js';
import { Public } from './public.decorator.js';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly auth: AuthService,
    private readonly config: ConfigService<EnvironmentVariables, true>,
  ) {}

  // Hai route nhận mật khẩu chịu giới hạn chặt hơn phần còn lại: chặn việc thử hàng nghìn mật khẩu.
  @Public()
  @PasswordAttempt()
  @Post('register')
  async register(
    @Body() dto: RegisterDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    return this.startSession(res, await this.auth.register(dto));
  }

  @Public()
  @PasswordAttempt()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(
    @Body() dto: LoginDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    return this.startSession(res, await this.auth.login(dto));
  }

  // Public: đăng xuất phải làm được cả khi cookie đã hết hạn hoặc hỏng.
  @Public()
  @Post('logout')
  @HttpCode(HttpStatus.NO_CONTENT)
  logout(@Res({ passthrough: true }) res: Response): void {
    res.clearCookie(ACCESS_TOKEN_COOKIE, this.cookieOptions());
  }

  @Get('me')
  me(@CurrentUser() userId: string) {
    return this.auth.me(userId);
  }

  /** Token đi vào cookie; body chỉ chứa thông tin người dùng. */
  private startSession(res: Response, result: AuthResult) {
    res.cookie(ACCESS_TOKEN_COOKIE, result.token, {
      ...this.cookieOptions(),
      maxAge: SESSION_TTL_SECONDS * 1000,
    });
    return {
      user: result.user,
      claimedExistingData: result.claimedExistingData,
    };
  }

  private cookieOptions(): CookieOptions {
    return {
      // httpOnly: JavaScript trên trang KHÔNG đọc được cookie → một lỗi XSS không lấy được token.
      httpOnly: true,
      // lax: cookie không đi kèm request POST/PATCH/DELETE phát ra từ site khác (chống CSRF).
      sameSite: 'lax',
      // secure: chỉ gửi qua HTTPS. Tắt ở local vì http://localhost không có HTTPS.
      secure: this.config.get('NODE_ENV', { infer: true }) === 'production',
      path: '/',
    };
  }
}
