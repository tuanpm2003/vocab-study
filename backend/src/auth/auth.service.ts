import {
  ConflictException,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { isUniqueViolation } from '../common/prisma-errors.js';
import {
  isLoopbackHost,
  type EnvironmentVariables,
} from '../config/env.validation.js';
import type { User } from '../generated/prisma/client.js';
import { PrismaService } from '../prisma/prisma.service.js';
import type { LoginDto, RegisterDto } from './dto/auth.dto.js';
import type { JwtPayload } from './jwt-auth.guard.js';
import { DUMMY_HASH, hashPassword, verifyPassword } from './password.js';

export interface UserResponse {
  id: string;
  email: string;
  displayName: string | null;
  createdAt: Date;
}

export interface AuthResult {
  user: UserResponse;
  /** JWT. Controller đặt nó vào cookie httpOnly — không bao giờ trả trong body. */
  token: string;
  /** Đăng ký này vừa nhận dữ liệu có từ trước khi app có đăng nhập (ADR-013). */
  claimedExistingData: boolean;
}

const INVALID_CREDENTIALS = 'Email hoặc mật khẩu không đúng';

// passwordHash cố ý KHÔNG có ở đây: hàm này là cửa duy nhất đưa User ra khỏi backend.
function toResponse(user: User): UserResponse {
  return {
    id: user.id,
    email: user.email ?? '',
    displayName: user.displayName,
    createdAt: user.createdAt,
  };
}

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService<EnvironmentVariables, true>,
  ) {}

  async register(dto: RegisterDto): Promise<AuthResult> {
    if (!this.config.get('REGISTRATION_ENABLED', { infer: true })) {
      throw new ForbiddenException('Đăng ký tài khoản đang bị tắt');
    }
    const passwordHash = await hashPassword(dto.password);
    const data = {
      email: dto.email,
      passwordHash,
      displayName: dto.displayName ?? null,
    };

    try {
      const claimed = await this.claimPlaceholder(data);
      const user = claimed ?? (await this.prisma.user.create({ data }));
      return {
        user: toResponse(user),
        token: await this.sign(user.id),
        claimedExistingData: claimed !== null,
      };
    } catch (error) {
      if (isUniqueViolation(error)) {
        throw new ConflictException('Email này đã được đăng ký');
      }
      throw error;
    }
  }

  async login(dto: LoginDto): Promise<AuthResult> {
    const user = await this.prisma.user.findFirst({
      where: { email: dto.email },
    });
    const valid = await verifyPassword(
      dto.password,
      user?.passwordHash ?? DUMMY_HASH,
    );
    // Cùng một thông điệp cho "email không tồn tại" và "sai mật khẩu".
    if (!user || !valid) throw new UnauthorizedException(INVALID_CREDENTIALS);
    return {
      user: toResponse(user),
      token: await this.sign(user.id),
      claimedExistingData: false,
    };
  }

  async me(userId: string): Promise<UserResponse> {
    const user = await this.prisma.user.findFirst({ where: { id: userId } });
    // Token còn hạn nhưng tài khoản đã bị xóa.
    if (!user) throw new UnauthorizedException('Tài khoản không còn tồn tại');
    return toResponse(user);
  }

  /**
   * Dữ liệu có từ trước Phase 12 thuộc về một dòng User "giữ chỗ" (id = LOCAL_OWNER_ID, chưa
   * có mật khẩu). Tài khoản ĐẦU TIÊN đăng ký sẽ điền email + mật khẩu vào chính dòng đó và
   * trở thành chủ của dữ liệu cũ.
   *
   * updateMany với điều kiện `passwordHash: null` là thao tác nguyên tử: hai người đăng ký
   * cùng lúc thì chỉ một lệnh khớp được dòng giữ chỗ, người kia nhận count = 0 và được tạo
   * tài khoản mới — không ai ghi đè mật khẩu của ai.
   *
   * Hai chốt bên ngoài hàm này: browserRequestGuard (một trang web lạ không tự gửi form tới
   * /auth/register được) và REGISTRATION_ENABLED=false (khóa hẳn đăng ký).
   */
  private async claimPlaceholder(data: {
    email: string;
    passwordHash: string;
    displayName: string | null;
  }): Promise<User | null> {
    const placeholderId = this.config.get('LOCAL_OWNER_ID', { infer: true });
    if (!placeholderId) return null;
    // Chỉ nhận dữ liệu cũ khi backend đang chạy LOCAL. Trên một server nghe ngoài loopback,
    // "người đầu tiên đăng ký" có thể là bất kỳ ai trên internet — nên ở đó việc nhận bị tắt
    // hẳn: phải tạo tài khoản và nhận dữ liệu ở máy mình TRƯỚC khi đưa database lên mạng.
    if (!isLoopbackHost(this.config.get('HOST', { infer: true }))) return null;
    const { count } = await this.prisma.user.updateMany({
      where: { id: placeholderId, passwordHash: null },
      data,
    });
    if (count === 0) return null;
    return this.prisma.user.findFirst({ where: { id: placeholderId } });
  }

  private sign(userId: string): Promise<string> {
    const payload: JwtPayload = { sub: userId };
    return this.jwt.signAsync(payload);
  }
}
