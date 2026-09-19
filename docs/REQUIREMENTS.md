# REQUIREMENTS

> Yêu cầu của dự án, chốt ở Phase 0. Đây là nguồn sự thật khi có tranh cãi về phạm vi.
> Khi yêu cầu thay đổi, sửa file này **trước**, rồi mới sửa code.

---

## 1. Mục tiêu

Một web app cá nhân để **quản lý và ghi nhớ từ vựng nhiều ngôn ngữ** (Tiếng Trung,
Tiếng Anh, Tiếng Nhật, Tiếng Hàn, và ngôn ngữ thêm sau này).

Ứng dụng phải giải quyết đúng một vấn đề thực tế: *sau mỗi buổi tự học, tôi cần đổ nhanh
các từ mới vào đúng ngôn ngữ / level / bài học, và sau đó quay lại ôn chúng một cách có
hệ thống.*

### Flow mục tiêu

```
Mở app → Chọn Language → Chọn Level → Chọn Collection
       → Thêm Vocabulary (liên tục, nhanh) → Save
       → Sau đó: Study (Flashcard / Quiz)
       → Hệ thống ghi Learning Progress → Dashboard cập nhật
       → Ngày hôm sau: Review những từ cần ôn
```

### Ba hành động quan trọng nhất

1. **Add Vocabulary**
2. **Start Study**
3. **Review Due Words**

Mọi quyết định UI phải ưu tiên ba hành động này. Chúng phải tới được trong **một lần bấm**
từ bất kỳ đâu trong app.

---

## 2. Người dùng và quy mô

- **MVP: một người dùng duy nhất**, chạy local. Không xây SaaS multi-tenant.
- Kiến trúc phải cho phép thêm multi-user sau này **mà không thiết kế lại database**.
- Quy mô dự kiến: vài nghìn tới vài chục nghìn từ vựng. Không phải bài toán big data.

---

## 3. Yêu cầu chức năng — MVP

### 3.1 Quản lý ngôn ngữ

- Thêm / sửa / xóa / xem danh sách ngôn ngữ
- Mỗi thẻ ngôn ngữ hiển thị **số lượng từ vựng** trong đó
- Mở một ngôn ngữ → xem cây level và collection bên trong

### 3.2 Hệ thống level

- **Không được hard-code HSK, JLPT, CEFR.**
- Mỗi ngôn ngữ có thể có level system riêng, do người dùng tự tạo:
  - Tiếng Trung → HSK → HSK 1..6
  - Tiếng Nhật → JLPT → N5..N1
  - Tiếng Anh → CEFR (A1..C2) **hoặc** Custom (Beginner / Intermediate / Advanced)
- Level phải có **thứ tự** (N5 đứng trước N4)

### 3.3 Collection / Lesson / Topic

- Chia từ vựng thành collection: `Lesson 1`, `Lesson 2`, `Daily Conversation`, `Food`...
- Collection có thể **thuộc một level** (`N5 > Lesson 3`) hoặc **xuyên level** (`Food`)
- **Một từ có thể thuộc nhiều collection cùng lúc** — đây là yêu cầu bắt buộc, không
  phải nice-to-have

### 3.4 Quản lý từ vựng

Một từ vựng có thể chứa: word, meaning, pronunciation, example sentence, example
translation, language, level, collection, topic, notes, tags, created date, updated date.

**Ràng buộc quan trọng:**
- **Không bắt buộc tất cả các trường** — mỗi ngôn ngữ có đặc điểm khác nhau
- **Không được tạo bảng riêng cho từng ngôn ngữ** (`JapaneseVocabulary`,
  `ChineseVocabulary`, `EnglishVocabulary`)

Ví dụ cùng một mô hình phải chứa được cả ba:

| | Tiếng Nhật | Tiếng Trung | Tiếng Anh |
|---|---|---|---|
| Từ | 食べる | 你好 | appointment |
| Đọc | たべる | nǐ hǎo | /əˈpɔɪntmənt/ |
| Latin hóa | taberu | ni hao | — |
| Nghĩa | to eat | hello | cuộc hẹn |

### 3.5 Giao diện thêm từ — ưu tiên cao nhất

Sau khi lưu một từ, form **giữ lại** Language / Level / Collection và **xóa** các field
còn lại, con trỏ quay về ô nhập từ.

Mục tiêu cụ thể: **nhập 20 từ liên tục mà không phải chạm chuột.**

### 3.6 Chế độ học

**Flashcard**
```
Mặt trước: 食べる  →  [Hiện đáp án]
Mặt sau:   たべる / taberu / to eat / câu ví dụ + bản dịch
Đánh giá:  [Again] [Hard] [Good] [Easy]
```

**Trắc nghiệm — chọn nghĩa**
> "食べる" có nghĩa là gì? → A. Uống  B. Ăn  C. Ngủ  D. Đi

**Trắc nghiệm — chọn từ**
> Từ tiếng Nhật nào nghĩa là "ăn"? → A. 飲む  B. 食べる  C. 寝る  D. 行く

### 3.7 Learning Progress

Lưu cho mỗi từ: `reviewCount`, `correctCount`, `incorrectCount`, `lastReviewedAt`,
và `status` ∈ `NEW | LEARNING | REVIEW | MASTERED`.

**MVP không triển khai Spaced Repetition phức tạp.** Chỉ đếm và ghi nhận.

### 3.8 Dashboard

MVP chỉ cần đơn giản:
```
Hôm nay:  Japanese  20 từ ôn / 15 đúng / 5 sai
          Chinese   10 từ ôn /  8 đúng / 2 sai
```
Có thể bổ sung: tổng số từ, số từ đã thuộc, tỷ lệ đúng, streak, số từ cần ôn.

### 3.9 Search & Filter

- Tìm theo từ, nghĩa, cách đọc
- Lọc theo: Language, Level, Collection, Status
- Backend phải hỗ trợ **pagination, search, filter, sorting**
- **Không được load toàn bộ database lên frontend**

---

## 4. Yêu cầu phi chức năng

### UI
Clean, tối giản, nhanh, responsive, mobile-friendly, dễ nhập từ, dễ bắt đầu học,
**không nhiều animation**, **không điều hướng phức tạp**.

### Kỹ thuật
- TypeScript strict ở cả frontend và backend
- Không hard-code secret (DB password, API key, AWS credential, JWT secret)
- Backend phải validate mọi input
- API phải xử lý lỗi rõ ràng
- Dùng database migration đúng cách
- README luôn được cập nhật

### Môi trường phát triển
- Windows 11, PowerShell
- PostgreSQL chạy trong Docker; frontend và backend chạy trực tiếp bằng `npm run dev`

---

## 5. NGOÀI phạm vi MVP

Các mục sau **cố ý không làm** ở MVP, nhưng kiến trúc phải cho phép thêm vào sau:

| Nhóm | Mục |
|---|---|
| AI | Tạo câu ví dụ, tạo quiz, giải thích khác biệt giữa các từ, AI conversation |
| Giọng nói | Text-to-Speech (Amazon Polly), Speech Recognition, chấm phát âm |
| Học tập | Spaced Repetition (Leitner / SM-2 / FSRS), Typing mode |
| Dữ liệu | Import/Export CSV, import từ Anki, ảnh và audio cho từ vựng |
| Hệ thống | Multi-user, authentication, đồng bộ cloud, notification, payment |
| Giao diện | Dark mode, PWA |
| Hạ tầng | Microservices, Kubernetes |

**Ràng buộc kiến trúc:** tính năng AI và giọng nói phải nằm ở **module riêng**, tách biệt
hoàn toàn với core vocabulary system. Core phải chạy được khi tắt hoàn toàn AI.

---

## 6. Tiêu chí thành công của MVP

MVP được coi là hoàn thành khi bạn có thể thực hiện trọn vẹn chuỗi sau, bằng app thật,
không cần chạm vào database:

```
Tạo Language → Tạo Level System + Level → Tạo Collection
→ Thêm 20 từ liên tiếp → Tìm và lọc chúng
→ Học bằng Flashcard → Làm Quiz
→ Xem Learning Progress được ghi lại
→ Xem Dashboard phản ánh đúng những gì vừa học
```

Và quan trọng không kém: **bạn hiểu được từng phần code đã tạo ra nó.**
