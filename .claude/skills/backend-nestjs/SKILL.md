---
name: backend-nestjs
description: Mẫu chuẩn để viết backend NestJS trong dự án này — cấu trúc module, DTO với class-validator, tầng service, xử lý lỗi, phân trang, và các bẫy thường gặp. Dùng khi tạo hoặc sửa bất kỳ code nào trong backend/src.
---

# Backend NestJS — mẫu chuẩn của dự án

## Phân tầng: ai chịu trách nhiệm gì

```
Request
   ↓
Controller   — chỉ xử lý HTTP: nhận param/body, gọi service, trả kết quả.
   ↓           KHÔNG có if/else nghiệp vụ, KHÔNG gọi Prisma trực tiếp.
Service      — toàn bộ business logic. Ném exception khi dữ liệu sai.
   ↓           Đây là nơi duy nhất gọi Prisma.
PrismaService — truy cập database.
```

**Cách kiểm tra bạn có đang phân tầng đúng không:** nếu mai kia thay REST bằng GraphQL,
bạn chỉ phải viết lại Controller. Nếu phải viết lại cả Service, tức là logic đã lọt sai chỗ.

## Cấu trúc một module

```
src/languages/
├── languages.module.ts
├── languages.controller.ts
├── languages.service.ts
├── dto/
│   ├── create-language.dto.ts
│   ├── update-language.dto.ts
│   └── query-language.dto.ts
└── languages.service.spec.ts
```

Module mới phải được `imports` vào `app.module.ts`, và phải `imports: [PrismaModule]`
để dùng được `PrismaService`.

## DTO — nơi duy nhất input được kiểm tra

```ts
// create-language.dto.ts
import { IsString, IsNotEmpty, MaxLength, IsOptional } from 'class-validator';

export class CreateLanguageDto {
  @IsString()
  @IsNotEmpty({ message: 'Tên ngôn ngữ không được để trống' })
  @MaxLength(50)
  name: string;

  @IsOptional()
  @IsString()
  @MaxLength(10)
  code?: string;   // 'ja', 'zh', 'en'
}
```

DTO cho update dùng `PartialType` để khỏi lặp lại:

```ts
import { PartialType } from '@nestjs/mapped-types';
export class UpdateLanguageDto extends PartialType(CreateLanguageDto) {}
```

**Bắt buộc trong `main.ts`:**

```ts
app.useGlobalPipes(new ValidationPipe({
  whitelist: true,              // xóa field không khai báo trong DTO
  forbidNonWhitelisted: true,   // báo lỗi nếu client gửi field lạ
  transform: true,              // tự chuyển string "1" → number 1
  transformOptions: { enableImplicitConversion: true },
}));
```

`whitelist` và `forbidNonWhitelisted` **chống mass assignment**: không có chúng, client
gửi thêm `{"ownerId": "cua-nguoi-khac"}` và giá trị đó sẽ chui thẳng vào database.

## Service — mẫu chuẩn

```ts
@Injectable()
export class LanguagesService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(ownerId: string) {
    return this.prisma.language.findMany({
      where: { ownerId },                         // ← LUÔN LUÔN có
      orderBy: { name: 'asc' },
      include: { _count: { select: { vocabularies: true } } },
    });
  }

  async findOne(id: string, ownerId: string) {
    const language = await this.prisma.language.findFirst({
      where: { id, ownerId },                     // findFirst + ownerId,
    });                                           //   KHÔNG dùng findUnique({ id })
    if (!language) {
      throw new NotFoundException(`Không tìm thấy ngôn ngữ với id ${id}`);
    }
    return language;
  }
}
```

**Tại sao `findFirst({ id, ownerId })` chứ không phải `findUnique({ id })`?**
`findUnique` chỉ nhận trường unique, nên bạn không lọc được `ownerId` trong cùng một
truy vấn. Hậu quả: bạn lấy được bản ghi của người khác rồi mới kiểm tra — dễ quên bước
kiểm tra, và đó chính là lỗ hổng IDOR. `findFirst` chậm hơn không đáng kể và an toàn
theo mặc định.

## Xử lý lỗi

Dùng exception có sẵn của NestJS, đừng tự chế:

| Tình huống | Exception | Status |
|---|---|---|
| Không tìm thấy | `NotFoundException` | 404 |
| Input sai | `BadRequestException` | 400 |
| Vi phạm ràng buộc nghiệp vụ | `ConflictException` | 409 |
| Chưa đăng nhập (Phase 12) | `UnauthorizedException` | 401 |
| Không có quyền (Phase 12) | `ForbiddenException` | 403 |

`ValidationPipe` tự ném 400 cho lỗi DTO — không cần tự viết.

**Không bao giờ để lỗi Prisma lọt nguyên ra ngoài.** Lỗi Prisma chứa tên bảng, tên cột,
đôi khi cả câu SQL. Bắt các mã lỗi hay gặp:

```ts
// P2002 = vi phạm unique constraint
// P2025 = bản ghi cần update/delete không tồn tại
// P2003 = vi phạm foreign key
```

Dự án có `common/filters/prisma-exception.filter.ts` làm việc này tập trung.

## Phân trang — mẫu bắt buộc cho mọi endpoint danh sách

```ts
// common/dto/pagination.dto.ts
export class PaginationDto {
  @IsOptional() @Type(() => Number) @IsInt() @Min(1)
  page?: number = 1;

  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(100)   // ← Max rất quan trọng
  limit?: number = 20;
}
```

`@Max(100)` chặn việc client gửi `limit=999999` và tự làm sập server của chính mình.

```ts
const [items, total] = await this.prisma.$transaction([
  this.prisma.vocabulary.findMany({ where, skip: (page - 1) * limit, take: limit }),
  this.prisma.vocabulary.count({ where }),
]);
return { items, total, page, limit, totalPages: Math.ceil(total / limit) };
```

Dùng `$transaction` để hai truy vấn nhìn cùng một ảnh chụp dữ liệu — nếu không, có thể
có bản ghi được thêm vào giữa hai truy vấn và `total` sẽ lệch.

## `ownerId` — lấy từ đâu

```ts
// common/decorators/current-user.decorator.ts
export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): string => {
    // MVP: một người dùng. Phase 12: đọc từ JWT payload.
    return process.env.LOCAL_OWNER_ID ?? 'local-owner';
  },
);

// controller
@Get()
findAll(@CurrentUser() ownerId: string) {
  return this.languagesService.findAll(ownerId);
}
```

Toàn bộ mục đích của decorator này là: **Phase 12 chỉ cần sửa thân hàm này**, không phải
sửa chữ ký của hàng chục method.

## Bẫy thường gặp

| Bẫy | Triệu chứng | Cách tránh |
|---|---|---|
| Quên `await` | Trả về `Promise {}` hoặc lỗi xảy ra sau khi response đã gửi | Bật ESLint rule `@typescript-eslint/no-floating-promises` |
| **N+1 query** | Vòng lặp gọi Prisma bên trong; app chậm dần khi nhiều dữ liệu | Dùng `include` / `select`, hoặc một truy vấn `findMany` với `in` |
| Quên `PrismaModule` trong `imports` | `Nest can't resolve dependencies of X` | Luôn `imports: [PrismaModule]` |
| Business logic nằm trong Controller | Controller dài quá 10 dòng mỗi method | Đẩy xuống Service |
| Dùng `findUnique` rồi mới kiểm tra `ownerId` | Không có triệu chứng ở MVP; lỗ hổng IDOR ở Phase 12 | Dùng `findFirst({ id, ownerId })` |
| Quên `enableShutdownHooks` của Prisma | Kết nối DB không đóng khi tắt app | Đã xử lý trong `PrismaService` |

## Swagger

Thêm `@ApiTags()` ở controller và `@ApiProperty()` ở DTO. Swagger UI ở
`http://localhost:4000/api`. Nó vừa là tài liệu sống, vừa là chỗ để bạn thử endpoint
mà không cần Postman.
