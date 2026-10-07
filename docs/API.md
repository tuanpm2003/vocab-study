# API CONTRACT

> Hợp đồng giữa frontend và backend. Quy ước chung (đặt tên URL, mã trạng thái, shape
> response/error) ở skill `api-contract`.
>
> **Trạng thái:** endpoint có dấu ✅ đã implement và có test; ⬜ mới là thiết kế.
> Mỗi phase sẽ cập nhật file này khi endpoint thật sự tồn tại.

Ký hiệu: ⬜ chưa làm · ✅ đã implement và có test

---

## Quy ước tóm tắt

| | |
|---|---|
| Base URL (local) | `http://localhost:4000` |
| Content-Type | `application/json` |
| Tài nguyên đơn | trả thẳng object, không bọc `{ data }` |
| Danh sách | luôn bọc `{ items, total, page, limit, totalPages }` |
| Cập nhật | `PATCH` (không dùng `PUT`) |
| Xóa | `DELETE` → 204, không có body |

Mọi endpoint đều **ngầm định lọc theo `ownerId`** lấy từ `@CurrentUser()`.
Client không gửi và không thấy `ownerId`.

---

## Health — Phase 1

### ✅ `GET /health`
Kiểm tra app sống và database kết nối được. Cần cho health check của ALB/App Runner ở Phase 13.

**200**
```json
{ "status": "ok", "database": "connected", "timestamp": "2026-09-18T10:00:00.000Z" }
```
**503** khi không kết nối được database.

---

## Languages — Phase 2

### ✅ `GET /languages`
**Mục đích:** Trang Languages — danh sách ngôn ngữ kèm số từ vựng.
**Query:** `page` (≥1, mặc định 1), `limit` (1-100, mặc định 20)

**200**
```json
{
  "items": [
    { "id": "clx1", "name": "Japanese", "code": "ja", "vocabularyCount": 320,
      "createdAt": "...", "updatedAt": "..." }
  ],
  "total": 3, "page": 1, "limit": 20, "totalPages": 1
}
```
`vocabularyCount` lấy bằng `_count`, **không** load hết rồi `.length`.

### ✅ `POST /languages`
**Body:** `{ "name": string (1-50, bắt buộc), "code"?: string (≤10) }`
**201** → object Language
**400** thiếu `name`, hoặc gửi field lạ
**409** trùng tên trong cùng owner

### ✅ `GET /languages/:id`
**200** → Language kèm `levelSystems` (mỗi cái kèm `levels` đã sắp theo `order`)
**404** không tìm thấy

### ✅ `PATCH /languages/:id`
**Body:** các field của POST, tất cả optional · **200** / **404**

### ✅ `DELETE /languages/:id`
**204**. Xóa Language sẽ **cascade** xóa LevelSystem, Level, Collection, Vocabulary bên trong.
Frontend **phải** hỏi xác nhận kèm số lượng từ sẽ mất.
**404** không tìm thấy

---

## Level Systems & Levels — Phase 3

### ✅ `GET /languages/:languageId/level-systems`
**200** → mảng LevelSystem, mỗi cái kèm `levels` sắp theo `order`.
Không phân trang — số lượng luôn rất nhỏ (1-2 hệ thống mỗi ngôn ngữ).
*Đây là ngoại lệ duy nhất của quy tắc phân trang, và được ghi nhận có chủ đích.*

### ✅ `POST /languages/:languageId/level-systems`
**Body:** `{ "name": string, "isDefault"?: boolean, "levels"?: [{ "name": string, "order"?: number }] }`

`order` bỏ trống thì lấy theo vị trí trong mảng. Hệ thống **đầu tiên** của một ngôn ngữ tự
thành default **khi không gửi `isDefault`**. Ràng buộc được bảo đảm là "mỗi ngôn ngữ có *tối đa*
một default" — không phải "luôn có một": gửi `isDefault: false`, hoặc xóa hệ thống default,
sẽ để ngôn ngữ không có default nào (chỉ ảnh hưởng nhãn và thứ tự hiển thị). Tên level trùng nhau trong cùng request → 400.

Cho phép tạo cả hệ thống + danh sách level trong **một request**. Lý do UX: người dùng
tạo "JLPT" rồi phải gọi thêm 5 request để tạo N5..N1 là trải nghiệm tệ. Backend bọc trong
`$transaction`.

**201** → LevelSystem kèm levels

### ✅ `PATCH /level-systems/:id` · ✅ `DELETE /level-systems/:id`
`PATCH` nhận `{ name?, isDefault? }`. Đặt `isDefault: true` sẽ gỡ default của các hệ thống
khác **trong cùng ngôn ngữ** (mỗi ngôn ngữ tối đa một default).

### ✅ `POST /level-systems/:id/levels` · ✅ `PATCH /levels/:id` · ✅ `DELETE /levels/:id`
Tên level là duy nhất trong một hệ thống → trùng trả **409**.

### ✅ `POST /level-systems/:id/levels/reorder`
**Body:** `{ "levelIds": string[] }` — **toàn bộ** id level của hệ thống theo thứ tự mới.
**200** → LevelSystem kèm levels. Thiếu, thừa hoặc có id lạ → **400** (không ghi gì).
*Endpoint phát sinh ở Phase 3:* đổi chỗ hai level bằng hai lệnh `PATCH order` riêng lẻ có thể
dừng giữa chừng và để lại hai level cùng `order`.

Xóa Level → `Collection.levelId` và `Vocabulary.levelId` được set `null`,
**không** xóa collection hay từ vựng.

---

## Collections — Phase 3

### ✅ `GET /collections`
**Query:** `languageId` (bắt buộc), `levelId` (`null` để lấy collection xuyên level),
`kind` (`LESSON|TOPIC`), `page`, `limit`

**200** → envelope, mỗi item kèm `vocabularyCount`

### ✅ `POST /collections`
**Body:**
```json
{ "languageId": "clx1", "levelId": "clx5 | null", "name": "Lesson 3",
  "kind": "LESSON", "description": null }
```
`levelId: null` là **hợp lệ và có chủ đích** — đó là collection xuyên level (Topic).

**201** / **400** (gồm cả trường hợp level thuộc **ngôn ngữ khác**) / **404** (language hoặc
level không tồn tại)

### ✅ `GET /collections/:id` · ✅ `PATCH /collections/:id` · ✅ `DELETE /collections/:id`

`PATCH` không nhận `languageId` — collection không chuyển ngôn ngữ được sau khi tạo.
`levelId: null` gỡ collection khỏi level.

Xóa Collection **không** xóa từ vựng — chỉ xóa các dòng trong bảng nối
`VocabularyCollection`. Một từ thuộc 3 collection, xóa 1 collection thì từ vẫn còn ở 2 cái kia.

---

## Vocabulary — Phase 4

### ✅ `GET /vocabularies`
**Mục đích:** màn hình danh sách từ vựng với search + filter.

**Query:**
| Param | Kiểu | Ghi chú |
|---|---|---|
| `page` / `limit` | int | mặc định 1 / 20, `limit` tối đa **100**, `page` tối đa 100 000 |
| `search` | string | tìm trong `term`, `meaning`, `reading`, `romanization` (không phân biệt hoa thường; `%` và `_` được tìm như ký tự thường) |
| `languageId` / `levelId` / `collectionId` | string | filter |
| `status` | enum | `NEW\|LEARNING\|REVIEW\|MASTERED` (từ Phase 9) |
| `sort` | string | `createdAt`, `updatedAt`, `term` × `asc`/`desc`; mặc định `createdAt:desc` — **whitelist** |

**200**
```json
{
  "items": [{
    "id": "clx9", "term": "食べる", "meaning": "to eat",
    "reading": "たべる", "romanization": "taberu",
    "exampleSentence": "毎日ご飯を食べます。",
    "exampleTranslation": "Tôi ăn cơm mỗi ngày.",
    "notes": null, "extra": { "verbGroup": "ichidan" },
    "language": { "id": "clx1", "name": "Japanese" },
    "level": { "id": "clx5", "name": "N5" },
    "collections": [
      { "id": "clx7", "name": "Lesson 3" },
      { "id": "clx8", "name": "Food" }
    ],
    "progress": { "status": "REVIEW", "reviewCount": 8, "correctCount": 6,
                  "incorrectCount": 2, "lastReviewedAt": "...", "dueAt": "...",
                  "intervalDays": 15, "easeFactor": 2.36, "repetitions": 3 },
    "createdAt": "...", "updatedAt": "..."
  }],
  "total": 253, "page": 1, "limit": 20, "totalPages": 13
}
```
`sort` **phải** được whitelist — nhận chuỗi tùy ý từ client rồi đưa vào `orderBy` là lỗ hổng.

### ✅ `POST /vocabularies`
**Body:**
```json
{
  "languageId": "clx1",          // bắt buộc
  "levelId": "clx5",             // tùy chọn
  "collectionIds": ["clx7"],     // tùy chọn, mảng — quan hệ N-N
  "term": "食べる",               // bắt buộc
  "meaning": "to eat",           // bắt buộc
  "reading": "たべる",
  "romanization": "taberu",
  "exampleSentence": null, "exampleTranslation": null, "notes": null,
  "extra": { "verbGroup": "ichidan" }
}
```

**201** → Vocabulary, **có thể kèm** `warnings`:
```json
{ "id": "clx9", "term": "行", "warnings": [
    { "code": "POSSIBLE_DUPLICATE", "message": "Từ này đã có trong Lesson 1",
      "existingIds": ["clx99"] } ] }
```

**Từ trùng KHÔNG trả 409.** Từ đồng tự khác nghĩa là hợp lệ (`行` = đi / hàng).
Frontend hiển thị cảnh báo và để người dùng quyết định. Xem [DATABASE.md §6](DATABASE.md).

Tạo Vocabulary + các dòng `VocabularyCollection` phải nằm trong cùng một `$transaction`.

### ✅ `GET /vocabularies/:id` · ✅ `PATCH /vocabularies/:id` · ✅ `DELETE /vocabularies/:id`

`PATCH` với `collectionIds` sẽ **thay thế toàn bộ** danh sách collection (xóa hết rồi thêm
lại), phải nằm trong `$transaction` — nếu xóa xong mà thêm lỗi, từ sẽ mất hết collection.

`DELETE` → 204, cascade xóa các dòng bảng nối, `LearningProgress`, và `ReviewLog`.

---

## Learning — Phase 7-9

### ✅ `GET /learning/session` *(flashcard: Phase 7 · multiple_choice: Phase 8)*
**Mục đích:** lấy bộ từ cho một phiên học.
**Query:** `mode` (`flashcard|multiple_choice`), `questionType`
(`term_to_meaning|meaning_to_term`, chỉ cho trắc nghiệm), `languageId`, `levelId`,
`collectionId`, `limit` (1-100, mặc định 20)

**200** — với `flashcard`, mỗi item là `{ vocabulary, intervals }`; `intervals` cho biết số ngày
tới lần ôn kế tiếp nếu chấm từng mức, ví dụ `{ "AGAIN": 0, "HARD": 12, "GOOD": 15, "EASY": 16 }`.

Với `multiple_choice`, backend sinh sẵn đáp án nhiễu:
```json
{ "items": [{
    "vocabulary": { "id": "clx9", "term": "食べる", "meaning": "to eat", "reading": "たべる" },
    "questionType": "term_to_meaning", "prompt": "食べる",
    "choices": ["Uống", "Ăn", "Ngủ", "Đi"],
    "correctIndex": 1
  }] }
```
Sinh đáp án nhiễu ở **backend**, không ở frontend — nếu làm ở frontend thì phải tải toàn
bộ từ vựng về máy client, vi phạm yêu cầu "không load toàn bộ database lên frontend".

### ✅ `POST /learning/review`
**Body:**
```json
{ "vocabularyId": "clx9", "mode": "FLASHCARD", "rating": "GOOD" }
```
`rating` cho flashcard, `isCorrect` cho quiz. Đúng một trong hai phải có, và phải khớp
với `mode` — sai thì **400**. Field còn lại bỏ trống hoặc gửi `null` đều được. Từ không tồn tại → **404**. Quy tắc tính trạng thái: ADR-010.

**201** → `{ vocabularyId, status, reviewCount, correctCount, incorrectCount, lastReviewedAt, dueAt, intervalDays }`

`intervalDays` là số ngày tới lần ôn kế tiếp do SM-2 tính (ADR-012); `dueAt` là 00:00 giờ
địa phương (`APP_TIMEZONE`) của ngày đó. Quên → `intervalDays: 0`, `dueAt` = thời điểm vừa ôn.
Client **không** gửi được lịch ôn — mọi field ngoài bốn field của body đều bị từ chối (400).

Backend làm trong một `$transaction`:
1. Tạo một dòng `ReviewLog`
2. `upsert` `LearningProgress` (tạo mới nếu từ này chưa từng được ôn)
3. Cập nhật `reviewCount`, `correctCount`/`incorrectCount`, `lastReviewedAt`, `status`
4. *(Phase 11)* tính `dueAt`, `intervalDays`, `easeFactor` theo thuật toán SRS

### ✅ `GET /learning/due`
**Query:** `languageId`, `levelId`, `collectionId`, `limit` (1-100, mặc định 20)
**200** → `{ items: [{ vocabulary }], total }` — cùng shape với phiên flashcard, thêm `total`
là tổng số từ cần ôn trong phạm vi.

Từ **đến hạn ôn** (ADR-012): chưa ôn lần nào, hoặc `dueAt ≤ now` (dòng tiến độ tạo trước
Phase 11 có `dueAt` null cũng được coi là đến hạn). Thứ tự: quá hạn lâu nhất trước, từ chưa
ôn lần nào sau cùng. Mỗi item kèm `intervals` như phiên flashcard.

### ✅ `GET /learning/stats` — Phase 10
**Query:** không có. (`from`/`to` của bản thiết kế Phase 0 chưa làm — chưa có màn hình nào cần.)

**200**
```json
{
  "today": { "reviewed": 45, "correct": 37, "incorrect": 8, "accuracy": 0.822 },
  "byLanguage": [
    { "languageId": "clx1", "name": "Japanese", "reviewed": 20, "correct": 15, "incorrect": 5 }
  ],
  "totals": { "languages": 3, "vocabulary": 690, "new": 120, "learning": 340, "review": 180, "mastered": 50 },
  "dueCount": 63,
  "streak": 7
}
```
`today` và `streak` tính theo múi giờ `APP_TIMEZONE` của backend (mặc định
`Asia/Ho_Chi_Minh`), không theo UTC — xem ADR-011.

- `accuracy` là `null` khi hôm nay chưa ôn từ nào.
- `dueCount` = số từ đến hạn ôn, cùng điều kiện với `GET /learning/due` (ADR-012). Từ Phase 11
  nó **không còn** bằng `new` + `learning`: một từ `MASTERED` tới hạn vẫn được đếm.
- `streak`: số ngày liên tiếp có ôn; hôm nay chưa ôn thì vẫn tính tới hôm qua.

---

## Quy ước về `null` trong body

- Field **vắng mặt** trong `PATCH` = không đổi.
- `null` ở field **nullable** (`levelId`, `reading`, `notes`, `description`, `extra`…) = xóa giá trị.
- `null` ở field **bắt buộc** (`name`, `term`, `meaning`, `isDefault`…) → **400**.
- `null` ở `kind` và `order` (tùy chọn nhưng không nullable) = không đổi.

---

## Checklist trước khi đánh dấu ✅ cho một endpoint

- [ ] Có DTO với `class-validator` cho mọi input
- [ ] Endpoint danh sách có phân trang với `@Max(100)`
- [ ] `sort` được whitelist
- [ ] Mọi truy vấn có `ownerId` trong `where`
- [ ] Trả đúng status code (201 POST, 204 DELETE)
- [ ] Không tìm thấy → 404, không phải 500
- [ ] Có `@ApiTags` / `@ApiProperty` cho Swagger
- [ ] Có ít nhất một integration test
- [ ] Đã cập nhật file này
