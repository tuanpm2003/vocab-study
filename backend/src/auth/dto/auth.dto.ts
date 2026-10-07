import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, type TransformFnParams } from 'class-transformer';
import {
  IsEmail,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';
import { emptyToNull, rawValue } from '../../common/dto/transforms.js';

export const PASSWORD_MIN_LENGTH = 8;
export const PASSWORD_MAX_LENGTH = 128;

/** "A@B.com " và "a@b.com" là cùng một tài khoản. */
function normalizeEmail({ value }: TransformFnParams): unknown {
  return typeof value === 'string' ? value.trim().toLowerCase() : value;
}

export class LoginDto {
  @ApiProperty({ example: 'ban@example.com' })
  @Transform(normalizeEmail)
  @IsEmail({}, { message: 'Email không hợp lệ' })
  @MaxLength(254)
  email: string;

  // rawValue: mật khẩu phải được dùng ĐÚNG như người dùng gõ — không ép kiểu, không cắt
  // khoảng trắng. Trần 128 ký tự để scrypt không phải băm một chuỗi hàng MB.
  @ApiProperty()
  @Transform(rawValue)
  @IsString({ message: 'Mật khẩu không hợp lệ' })
  @MinLength(1, { message: 'Mật khẩu không được để trống' })
  @MaxLength(PASSWORD_MAX_LENGTH)
  password: string;
}

export class RegisterDto {
  @ApiProperty({ example: 'ban@example.com' })
  @Transform(normalizeEmail)
  @IsEmail({}, { message: 'Email không hợp lệ' })
  @MaxLength(254)
  email: string;

  @ApiProperty({
    minLength: PASSWORD_MIN_LENGTH,
    maxLength: PASSWORD_MAX_LENGTH,
  })
  @Transform(rawValue)
  @IsString({ message: 'Mật khẩu không hợp lệ' })
  @MinLength(PASSWORD_MIN_LENGTH, {
    message: `Mật khẩu cần ít nhất ${PASSWORD_MIN_LENGTH} ký tự`,
  })
  @MaxLength(PASSWORD_MAX_LENGTH, {
    message: `Mật khẩu dài tối đa ${PASSWORD_MAX_LENGTH} ký tự`,
  })
  password: string;

  @ApiPropertyOptional({ maxLength: 50, nullable: true })
  @IsOptional()
  @Transform(emptyToNull)
  @IsString()
  @MaxLength(50, { message: 'Tên hiển thị dài tối đa 50 ký tự' })
  displayName?: string | null;
}
