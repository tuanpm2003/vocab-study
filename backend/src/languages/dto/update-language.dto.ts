import { PartialType } from '@nestjs/swagger';
import { CreateLanguageDto } from './create-language.dto.js';

// skipNullProperties: false — PartialType mặc định cho cả `null` bỏ qua validate, nên
// `{"name": null}` sẽ đi thẳng tới Prisma và thành lỗi 500. Với tùy chọn này chỉ field
// VẮNG MẶT mới được bỏ qua; `null` chỉ hợp lệ ở field tự khai báo @IsOptional.
export class UpdateLanguageDto extends PartialType(CreateLanguageDto, {
  skipNullProperties: false,
}) {}
