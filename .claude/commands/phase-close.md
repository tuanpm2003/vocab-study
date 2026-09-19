---
description: Đóng một Phase — cập nhật tài liệu, CHANGELOG, TODO và tạo commit. Chỉ chạy sau khi đã qua G5 (con người chạy thử và hiểu code)
argument-hint: <số phase> <tên ngắn của phase>
---

Đóng **Phase $1 — $2**.

## Bước 1 — Xác nhận G5

Hỏi con người trước khi làm bất cứ việc gì khác:

> *"Trước khi đóng phase: bạn đã tự chạy app và thấy tính năng hoạt động chưa?
> Và có phần code nào bạn chưa hiểu rõ không? (G5 là gate duy nhất tôi không thể tự xác nhận)"*

Nếu họ nói còn chỗ chưa hiểu → **giải thích trước, chưa đóng phase.** Mục tiêu của dự án
này là họ học được, không phải code chạy được.

## Bước 2 — Cập nhật tài liệu

Kiểm tra và cập nhật **chỉ những file thực sự thay đổi**:

| File | Cập nhật khi |
|---|---|
| `docs/DATABASE.md` | Schema đổi — cập nhật cả ERD text |
| `docs/API.md` | Có endpoint mới hoặc contract đổi |
| `docs/ARCHITECTURE.md` | Cấu trúc thư mục hoặc luồng dữ liệu đổi |
| `docs/DECISIONS.md` | Có quyết định khó đảo ngược → thêm ADR mới |
| `docs/TESTING.md` | Có loại test mới hoặc lệnh test mới |
| `CLAUDE.md` | Stack, quy tắc, hoặc roadmap đổi |
| `README.md` | Cách setup hoặc cách chạy đổi |

Không sửa file nào không cần sửa. Tài liệu thay đổi vô cớ làm `git diff` khó đọc.

## Bước 3 — CHANGELOG

Thêm mục mới vào `docs/CHANGELOG.md` theo định dạng Keep a Changelog:

```
## [Phase $1] — $2 — <ngày YYYY-MM-DD>

### Added
- ...
### Changed
- ...
### Fixed
- ...
### Notes
- <quyết định đáng nhớ, hoặc bẫy đã gặp>
```

## Bước 4 — PLAN và TODO

Trong `docs/PLAN.md`:
- Xác nhận **mọi task** của nhóm chức năng thuộc Phase $1 đều ✅ hoặc ⏸️ (có lý do).
  Nếu còn ⬜ hoặc 🔄 → **dừng lại, báo cho con người**. Không được đóng phase.
- Kiểm tra bảng Tổng quan khớp với số ✅ thực tế (đếm lại, đừng tin số cũ).
- Ghi kết quả Quality Gate vào cột Gate của nhóm, ví dụ `G1✅ G2✅ G3✅ G4✅ G5✅`.
- Thêm dòng nhật ký: `Đóng Phase $1`.

Trong `docs/TODO.md`:
- Thêm các mục hoãn lại từ Quality Gate (phần "Ghi vào TODO, chưa làm bây giờ").
- Mỗi mục mới phải ghi rõ **phase nào sẽ xử lý** — TODO không có thời điểm là TODO chết.

## Bước 5 — Cập nhật bảng Roadmap

Trong `CLAUDE.md`, đổi trạng thái Phase $1 từ ⬜ thành ✅.

## Bước 6 — Commit

Hiển thị `git status` và `git diff --stat` cho con người xem **trước khi** commit.

Commit message theo Conventional Commits, tiêu đề một dòng ngắn, thân mô tả những gì
đáng nhớ:

```
feat: $2

- <thay đổi chính>
- <thay đổi chính>

Phase $1. Quality gates: G1 ✅ G2 ✅ G3 ✅ G4 ✅ G5 ✅
```

**Không tự push.** Hỏi trước.

## Bước 7 — Tổng kết học được gì

Kết thúc bằng một đoạn ngắn (3-5 câu) trả lời: *sau phase này chủ dự án đã hiểu thêm
khái niệm gì mà trước đó chưa biết?* Nếu bạn không viết nổi đoạn này một cách cụ thể,
đó là dấu hiệu phase vừa rồi thiên về "code chạy được" hơn là "người học hiểu được" —
hãy nói thẳng điều đó.
