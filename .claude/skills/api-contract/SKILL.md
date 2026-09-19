---
name: api-contract
description: Quy ước REST API của dự án — đặt tên URL, mã trạng thái, shape của response và error, phân trang, filter, sorting. Dùng khi thiết kế endpoint mới hoặc kiểm tra code có đúng contract không.
---

# REST API — quy ước của dự án

Danh sách endpoint đầy đủ ở `docs/API.md`. Đây là các quy tắc dùng chung.

## Trước khi code một endpoint, phải mô tả đủ 7 mục

```
Mục đích:        (một câu)
Method + URL:    GET /vocabularies
Query params:    page, limit, languageId, levelId, collectionId, status, search, sort
Request body:    (JSON schema hoặc "không có")
Response 2xx:    (shape cụ thể)
Lỗi có thể xảy ra: 400 khi..., 404 khi...
Ai gọi nó:       (màn hình nào của frontend)
```

Nếu chưa viết được 7 mục này thì chưa đủ hiểu để code. Mục cuối đặc biệt quan trọng:
endpoint không có màn hình nào gọi là endpoint không nên tồn tại ở phase này.

## Đặt tên URL

- Danh từ **số nhiều**, **kebab-case**: `/languages`, `/level-systems`, `/vocabularies`
- Không có động từ trong URL. `POST /vocabularies` chứ không phải `/createVocabulary`.
- Quan hệ lồng nhau **chỉ lồng một cấp**: `GET /languages/:id/levels` được;
  `/languages/:id/levels/:lid/collections/:cid/vocabularies` thì không —
  dùng `GET /vocabularies?collectionId=:cid`.
- Hành động không phải CRUD thì đặt dưới một namespace động từ rõ ràng:
  `POST /learning/review`, `GET /learning/due`.

## Mã trạng thái

| Mã | Dùng khi |
|---|---|
| 200 | GET, PATCH thành công |
| 201 | POST tạo mới thành công |
| 204 | DELETE thành công, không có body |
| 400 | Input sai (ValidationPipe tự trả) |
| 404 | Không tìm thấy tài nguyên |
| 409 | Vi phạm ràng buộc nghiệp vụ (ví dụ: xóa Language khi còn từ vựng) |
| 422 | **Không dùng** trong dự án này — dùng 400 cho mọi lỗi input |
| 500 | Lỗi ngoài dự kiến. Nếu thấy 500 trong log, đó là bug cần sửa, không phải trạng thái bình thường |

Dùng `PATCH` cho cập nhật một phần. **Không dùng `PUT`** trong dự án này — ta không bao
giờ thay thế toàn bộ tài nguyên, và có hai động từ làm việc gần giống nhau chỉ gây nhầm lẫn.

## Shape của response

**Tài nguyên đơn:** trả thẳng object, không bọc thêm lớp `{ data: ... }`.

```json
{ "id": "clx...", "name": "Japanese", "code": "ja", "createdAt": "2026-09-18T..." }
```

**Danh sách:** LUÔN bọc trong envelope phân trang, kể cả khi hiện tại ít dữ liệu.

```json
{
  "items": [ ... ],
  "total": 253,
  "page": 1,
  "limit": 20,
  "totalPages": 13
}
```

Lý do bọc ngay từ đầu: khi dữ liệu nhiều lên và bạn cần phân trang, việc đổi từ mảng trần
sang envelope là **breaking change** phải sửa mọi chỗ gọi ở frontend. Bọc sẵn thì không
phải sửa gì.

**Không có endpoint danh sách nào được trả về toàn bộ bảng.** Không ngoại lệ, kể cả
`/languages` (hiện chỉ có 3-4 dòng) — nhất quán quan trọng hơn tiết kiệm vài dòng code.

## Shape của lỗi

Mọi lỗi trả về cùng một hình dạng, do exception filter chung tạo ra:

```json
{
  "statusCode": 404,
  "message": "Không tìm thấy ngôn ngữ với id clx123",
  "error": "Not Found",
  "path": "/languages/clx123",
  "timestamp": "2026-09-18T10:30:00.000Z"
}
```

Lỗi validate có `message` là mảng:

```json
{
  "statusCode": 400,
  "message": ["Tên ngôn ngữ không được để trống", "code phải dài tối đa 10 ký tự"],
  "error": "Bad Request"
}
```

**Thông điệp lỗi không được lộ** tên bảng, tên cột, câu SQL, stack trace, hay đường dẫn
file trên máy chủ.

## Query params chuẩn

| Param | Kiểu | Mặc định | Ghi chú |
|---|---|---|---|
| `page` | int ≥ 1 | 1 | |
| `limit` | int 1-100 | 20 | **phải có `@Max(100)`** |
| `search` | string | — | tìm trong `term`, `meaning`, `reading` |
| `sort` | string | `createdAt:desc` | dạng `<field>:<asc\|desc>` |
| `languageId` / `levelId` / `collectionId` | string | — | filter |
| `status` | enum | — | `NEW\|LEARNING\|REVIEW\|MASTERED` |

`sort` phải được **whitelist** — chỉ chấp nhận danh sách cột cho phép. Nhận chuỗi tùy ý
từ client rồi đưa thẳng vào `orderBy` là lỗ hổng.

## Cảnh báo mềm — trường hợp từ trùng

`POST /vocabularies` **không** trả 409 khi phát hiện từ đã tồn tại. Từ đồng tự khác nghĩa
là hợp lệ (`行` = đi / hàng). Thay vào đó trả 201 kèm cảnh báo để frontend hiển thị:

```json
{
  "id": "clx...",
  "term": "行",
  "warnings": [
    { "code": "POSSIBLE_DUPLICATE",
      "message": "Từ này đã có trong Lesson 1",
      "existingIds": ["clx999"] }
  ]
}
```

Đây là một nguyên tắc chung đáng nhớ: **ràng buộc database dùng cho thứ không bao giờ được
phép sai; cảnh báo ở tầng ứng dụng dùng cho thứ thường sai nhưng đôi khi hợp lệ.**

## Versioning

MVP **không** version API (không có `/v1/`). App cá nhân, frontend và backend deploy cùng
lúc, nên không có client cũ nào cần tương thích ngược. Thêm versioning khi có client
không do bạn kiểm soát — ghi nhận ở `docs/TODO.md`, xử lý ở Phase 13 nếu cần.

## Checklist trước khi coi endpoint là xong

- [ ] Có DTO với `class-validator` cho mọi input
- [ ] Endpoint danh sách có phân trang với `@Max(100)`
- [ ] `sort` được whitelist
- [ ] Mọi truy vấn có `ownerId` trong `where`
- [ ] Trả đúng mã trạng thái (201 cho POST, 204 cho DELETE)
- [ ] Trường hợp không tìm thấy trả 404, không phải 500
- [ ] Có `@ApiTags` / `@ApiProperty` để Swagger hiển thị đúng
- [ ] Đã cập nhật `docs/API.md`
