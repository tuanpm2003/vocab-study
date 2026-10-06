# DATABASE DESIGN

> Thiết kế database chốt ở Phase 0. Đây là nguồn sự thật cho thiết kế; `schema.prisma`
> là nguồn sự thật cho cài đặt. Khi hai file lệch nhau, đó là bug — sửa ngay.

Quy trình migration và mẫu code Prisma ở skill `database-prisma`.

---

## 1. Ba loại quan hệ dùng trong dự án

### One-to-Many (1-N)
*"Một cái chứa nhiều cái; mỗi cái con chỉ thuộc một cha."*
Cài đặt: bảng con giữ khóa ngoại trỏ về cha.
Ví dụ: một `Language` có nhiều `Level`.

### One-to-One (1-1)
*"Mỗi A có đúng một B."*
Cài đặt: giống 1-N nhưng khóa ngoại có ràng buộc `UNIQUE`.
Ví dụ: mỗi `Vocabulary` có đúng một `LearningProgress`.

**Tại sao không nhét `reviewCount` thẳng vào `Vocabulary`?** Vì đó là hai loại dữ liệu
khác bản chất: `Vocabulary` là **kiến thức** (từ này nghĩa là gì — không đổi),
`LearningProgress` là **trải nghiệm của người học** (tôi đã ôn bao nhiêu lần — đổi liên tục).

Lợi ích cụ thể ở Phase 12: khi có nhiều người dùng, một từ vựng sẽ có nhiều progress
(mỗi người một cái). Lúc đó chỉ cần đổi `@unique` trên `vocabularyId` thành
`@@unique([vocabularyId, ownerId])` — quan hệ 1-1 tự nhiên thành 1-N. Nếu gộp chung một
bảng, bạn sẽ phải tách bảng và migrate dữ liệu thật.

### Many-to-Many (N-N)
*"Nhiều A thuộc nhiều B."*
Cài đặt: **bắt buộc có bảng thứ ba** (junction table). Không có cách nào biểu diễn N-N
bằng hai bảng trong mô hình quan hệ.
Ví dụ: `Vocabulary` ↔ `Collection`.

---

## 2. ERD

```
Language
 ├── (1-N) LevelSystem
 │            └── (1-N) Level
 │                        ├── (1-N, nullable) Collection
 │                        └── (1-N, nullable) Vocabulary
 │
 ├── (1-N) Collection      ← Collection LUÔN thuộc 1 Language
 └── (1-N) Vocabulary      ← Vocabulary LUÔN thuộc 1 Language

Vocabulary ──N──  VocabularyCollection  ──N── Collection
Vocabulary ──1──  LearningProgress             (1-1)
Vocabulary ──1──  ReviewLog                    (1-N)
```

Hiển thị trên UI:
```
Japanese
├── JLPT                        (LevelSystem)
│   ├── N5                      (Level)
│   │   ├── Lesson 1            (Collection, levelId = N5)
│   │   ├── Lesson 2
│   │   └── Lesson 3
│   └── N4
│       └── Lesson 1
└── Topics                      (Collection có levelId = null)
    ├── Food
    └── Daily Conversation
```

---

## 3. Ba quyết định thiết kế cốt lõi

### (a) `Collection` thuộc `Language`, KHÔNG thuộc `Level`. `levelId` nullable.

| Collection | languageId | levelId | kind | Hiển thị |
|---|---|---|---|---|
| Lesson 3 | Japanese | N5 | `LESSON` | `Japanese > N5 > Lesson 3` |
| Food | Japanese | **null** | `TOPIC` | `Japanese > Topics > Food` |
| Daily Conversation | Japanese | **null** | `TOPIC` | `Japanese > Topics > Daily Conversation` |

Chỉ bằng **một khóa ngoại nullable**, ta có cả cây phân cấp lẫn chủ đề cắt ngang level.

Hệ quả quan trọng: **entity `Topic` không cần tồn tại.** Topic chính là Collection có
`kind = TOPIC` và `levelId = null`. Tiết kiệm được một bảng, một module CRUD, một màn hình.

**Nếu làm ngược lại** (`Collection` bắt buộc thuộc `Level`) thì `Food` — một chủ đề gồm từ
ở nhiều level — sẽ không biểu diễn được. Đó là lý do phương án phân cấp cứng bị loại.

### (b) `Vocabulary` ↔ `Collection` là Many-to-Many

Yêu cầu: `食べる` đồng thời thuộc `Lesson 3`, `Food`, và `Daily Conversation`.

Nếu dùng one-to-many (mỗi từ một collection), phải nhân bản từ ba lần. Hậu quả dây chuyền:
- Ba bản `LearningProgress` riêng → ôn trùng một từ ba lần trong một phiên học
- Dashboard báo "300 từ" nhưng thực tế chỉ có 200 từ
- Sửa nghĩa phải sửa ba chỗ, và sẽ có lúc quên
- **Không sửa được mà không đổi schema** — đúng loại lỗi buộc phải thiết kế lại DB

Bảng nối khai báo **tường minh** (`VocabularyCollection`) chứ không dùng implicit m-n của
Prisma, để thêm được metadata (`addedAt` hiện tại, `orderInLesson` sau này) mà không phải
migrate đau đớn.

### (c) Một bảng `Vocabulary` duy nhất cho mọi ngôn ngữ

**Quy tắc quyết định cột thật vs `extra` (JSONB):**

> Field cần **search / filter / sort** → **cột thật**.
> Field chỉ để **hiển thị** → **`extra`**.

Lý do kỹ thuật: cột thật được index hiệu quả và Prisma sinh TypeScript type cho nó.
Dữ liệu trong JSONB query được nhưng chậm hơn, và TypeScript không biết bên trong có gì
(phải tự validate bằng Zod).

`extra` là **van xả áp**, không phải nơi vứt mọi thứ.

---

## 4. Các entity

### Language
| Cột | Kiểu | Ghi chú |
|---|---|---|
| `id` | String `@id` `@default(cuid())` | |
| `ownerId` | String | Xem mục 5 |
| `name` | String | "Japanese", "Chinese" |
| `code` | String? | "ja", "zh", "en" — dùng cho TTS sau này |
| `createdAt` / `updatedAt` | DateTime | |

Index: `@@index([ownerId])`, `@@unique([ownerId, name])`

### LevelSystem
| Cột | Kiểu | Ghi chú |
|---|---|---|
| `id`, `languageId` | String | |
| `name` | String | "JLPT", "HSK", "CEFR", "Custom" |
| `isDefault` | Boolean `@default(false)` | Hệ thống được chọn sẵn khi thêm từ |

Một Language **có thể** có nhiều LevelSystem (tiếng Anh dùng cả CEFR lẫn Custom).
Thực tế bạn sẽ chỉ tạo một cái cho mỗi ngôn ngữ — nhưng schema không cản, và đó là toàn bộ
chi phí của sự linh hoạt này: một bảng bốn cột.

`onDelete: Cascade` từ Language.

### Level
| Cột | Kiểu | Ghi chú |
|---|---|---|
| `id`, `levelSystemId` | String | |
| `name` | String | "N5", "HSK 1", "Beginner" |
| `order` | Int | Để sắp xếp: N5=1, N4=2... |

Index: `@@index([levelSystemId])`, `@@unique([levelSystemId, name])`
`onDelete: Cascade` từ LevelSystem.

### Collection
| Cột | Kiểu | Ghi chú |
|---|---|---|
| `id`, `languageId` | String | **bắt buộc** |
| `levelId` | String? | **nullable** — đây là điểm mấu chốt |
| `name` | String | "Lesson 3", "Food" |
| `kind` | Enum `LESSON \| TOPIC` `@default(LESSON)` | |
| `description` | String? | |

Index: `@@index([languageId])`, `@@index([levelId])`
`onDelete: Cascade` từ Language; `onDelete: SetNull` từ Level
(xóa một level không được làm biến mất collection).

### Vocabulary
| Cột | Kiểu | Ghi chú |
|---|---|---|
| `id`, `ownerId`, `languageId` | String | `languageId` **bắt buộc** |
| `levelId` | String? | Level "chính" của từ |
| `term` | String | **bắt buộc** — 食べる / 你好 / appointment |
| `meaning` | String | **bắt buộc** |
| `reading` | String? | たべる / nǐ hǎo / /əˈpɔɪntmənt/ |
| `romanization` | String? | taberu / ni hao |
| `exampleSentence` | String? | |
| `exampleTranslation` | String? | |
| `notes` | String? | |
| `extra` | Json? | Field đặc thù ngôn ngữ |
| `createdAt` / `updatedAt` | DateTime | |

Index: `@@index([ownerId, languageId])`, `@@index([languageId, term])`, `@@index([levelId])`

Ví dụ `extra`:
- Nhật: `{ "kanji": "食べる", "verbGroup": "ichidan", "pitchAccent": 2 }`
- Trung: `{ "traditional": "你好", "toneNumbers": "ni3 hao3" }`
- Đức (sau này): `{ "gender": "das", "plural": "Bücher" }`

### VocabularyCollection (bảng nối)
| Cột | Kiểu |
|---|---|
| `vocabularyId`, `collectionId` | String |
| `addedAt` | DateTime `@default(now())` |

`@@id([vocabularyId, collectionId])`, `@@index([collectionId])`
`onDelete: Cascade` cả hai phía.

### LearningProgress
| Cột | Kiểu | Ghi chú |
|---|---|---|
| `id`, `ownerId` | String | |
| `vocabularyId` | String `@unique` | `@unique` → quan hệ 1-1 |
| `status` | Enum `NEW \| LEARNING \| REVIEW \| MASTERED` `@default(NEW)` | |
| `reviewCount`, `correctCount`, `incorrectCount` | Int `@default(0)` | |
| `correctStreak` | Int `@default(0)` | Số lần đúng liên tiếp — cơ sở chuyển trạng thái (ADR-010). *Thêm ở Phase 9* |
| `lastReviewedAt` | DateTime? | |
| — **các cột dưới đây MVP KHÔNG dùng** — | | |
| `dueAt` | DateTime? | Phase 11 |
| `intervalDays` | Int `@default(0)` | Phase 11 |
| `easeFactor` | Float `@default(2.5)` | Phase 11 — giá trị khởi tạo của SM-2 |
| `repetitions` | Int `@default(0)` | Phase 11 |

Index: `@@index([ownerId, status])`, `@@index([ownerId, dueAt])`

**Bốn cột cuối là ví dụ rõ nhất trong dự án về "thiết kế cho tương lai mà không xây tương
lai".** Chúng tốn đúng bốn cột trống. MVP bỏ qua hoàn toàn. Đến Phase 11, triển khai
SM-2 trở thành một **hàm thuần túy** — nhận `(easeFactor, intervalDays, repetitions, rating)`
trả về giá trị mới — và **không cần migration nào** trên dữ liệu đã dùng thật.

### ReviewLog
| Cột | Kiểu | Ghi chú |
|---|---|---|
| `id`, `ownerId`, `vocabularyId` | String | |
| `mode` | Enum `FLASHCARD \| MULTIPLE_CHOICE` | |
| `rating` | Enum `AGAIN \| HARD \| GOOD \| EASY`? | Cho flashcard |
| `isCorrect` | Boolean | **Luôn có.** Quiz: client gửi. Flashcard: suy từ `rating` (`AGAIN` = sai) — ADR-010 |
| `reviewedAt` | DateTime `@default(now())` | |

Index: `@@index([ownerId, reviewedAt])`, `@@index([vocabularyId])`

**Tại sao MVP vẫn cần bảng này?** Dashboard yêu cầu *"Hôm nay: 20 từ ôn, 15 đúng, 5 sai"*.
`LearningProgress` chỉ lưu tổng tích lũy và một mốc `lastReviewedAt` — từ đó **không thể**
biết hôm nay trả lời đúng bao nhiêu câu. Cần một dòng cho mỗi lần trả lời.

Chi phí: vài nghìn dòng mỗi năm — không đáng kể. Lợi ích kép: đây còn là **dữ liệu huấn
luyện** cho FSRS ở Phase 11. Nếu không ghi log từ đầu, Phase 11 sẽ bắt đầu từ con số không.

Xuất hiện ở **Phase 9**, không phải Phase 1.

---

## 5. `ownerId` — chuẩn bị cho multi-user

MVP **không có bảng `User`**. Nhưng `Language`, `Vocabulary`, `LearningProgress`,
`ReviewLog` đều có cột `ownerId` (String, **chưa có khóa ngoại**), lấy từ
`process.env.LOCAL_OWNER_ID`.

**Tại sao không hoãn luôn cột này?** Vì cái khó khi thêm auth không phải là tạo bảng `User`
(một migration, 10 phút). Cái khó là sửa **chữ ký của mọi service method** và **mọi truy
vấn Prisma** để mang theo `ownerId` — việc tốn hàng giờ và dễ bỏ sót. Bỏ sót ở đây nghĩa
là lỗ hổng IDOR.

Phase 12 chỉ còn: tạo bảng `User` → thêm khóa ngoại → thay thân hàm của decorator
`@CurrentUser()` bằng JWT guard. **Không một chữ ký hàm nào phải sửa.**

Đây cũng là lý do Quality Gate G4 kiểm tra `ownerId` mỗi phase — ở MVP nó **không có triệu
chứng nào** vì chỉ có một owner.

---

## 6. Chống trùng từ

**Không** đặt `UNIQUE` cứng trên `(languageId, term)`.

Lý do: có từ trùng mặt chữ khác nghĩa. Tiếng Trung `行` đọc *xíng* là "đi", đọc *háng* là
"hàng/dòng". Tiếng Anh `bank` là ngân hàng và cũng là bờ sông. Ràng buộc cứng sẽ chặn dữ
liệu hợp lệ, và bạn sẽ lách bằng cách thêm khoảng trắng thừa — tức là làm bẩn dữ liệu.

Thay vào đó: **index** `@@index([languageId, term])` để tra cứu nhanh, và
`POST /vocabularies` trả 201 kèm `warnings` để frontend hỏi lại người dùng.

> **Nguyên tắc chung:** ràng buộc database dùng cho thứ **không bao giờ** được phép sai;
> cảnh báo ở tầng ứng dụng dùng cho thứ **thường** sai nhưng **đôi khi** hợp lệ.

---

## 7. Entity CỐ Ý không tạo ở MVP

| Entity | Lý do |
|---|---|
| `User` | Xem mục 5 |
| `Tag` | `Collection` đã làm được việc của tag. Tag và Collection khác nhau về ý niệm nhưng **giống hệt nhau về cấu trúc dữ liệu**. Thêm sau nếu dùng vài tháng vẫn thấy thiếu |
| `Topic` | Chính là `Collection` với `kind = TOPIC`, `levelId = null` |

---

## 8. Thứ tự tạo bảng theo phase

| Phase | Bảng |
|---|---|
| 2 | `Language` |
| 3 | `LevelSystem`, `Level`, `Collection` |
| 4 | `Vocabulary`, `VocabularyCollection` |
| 9 | `LearningProgress`, `ReviewLog` |
| 12 | `User` + khóa ngoại cho mọi `ownerId` |

**Không tạo trước bảng của phase sau.** Bảng rỗng không dùng đến chỉ làm schema khó đọc
và tạo ảo giác rằng tính năng đó đã có.
