---
description: Ghi lại một quyết định kiến trúc vào docs/DECISIONS.md (Architecture Decision Record)
argument-hint: <tiêu đề quyết định>
---

Ghi ADR cho quyết định: **$ARGUMENTS**

## Bước 1 — Kiểm tra xem có đáng ghi ADR không

Chỉ ghi ADR khi quyết định thỏa **cả hai**:
1. **Khó đảo ngược** — đổi ý sau này tốn nhiều hơn một buổi làm việc.
2. **Không hiển nhiên** — người khác (hoặc chính bạn sáu tháng sau) có thể hợp lý mà
   chọn khác.

Ví dụ ĐÁNG ghi: chọn PostgreSQL thay vì MongoDB; cho `Collection.levelId` nullable;
hoãn bảng `User`.

Ví dụ KHÔNG đáng ghi: đặt tên biến; chọn dùng `map` thay vì `for`; format code.

Nếu quyết định không đạt cả hai tiêu chí, nói thẳng *"cái này không cần ADR"* và giải
thích ngắn tại sao. ADR loãng thì không ai đọc nữa.

## Bước 2 — Đọc DECISIONS.md

Đọc `docs/DECISIONS.md` để lấy số ADR tiếp theo và kiểm tra quyết định này có **mâu thuẫn
hay thay thế** ADR cũ nào không. Nếu có, ADR cũ phải được đánh dấu `Superseded by ADR-XXX`,
không được xóa — lịch sử quyết định chính là giá trị của tài liệu này.

## Bước 3 — Soạn ADR

```markdown
## ADR-XXX — <tiêu đề>

- **Ngày:** YYYY-MM-DD
- **Trạng thái:** Accepted
- **Phase:** <số>

### Bối cảnh
Tình huống nào dẫn tới việc phải quyết định? Ràng buộc nào đang có?
(Viết để người sáu tháng sau đọc vẫn hiểu — đừng giả định họ nhớ cuộc hội thoại này.)

### Các phương án đã cân nhắc
1. **<A>** — Ưu: ... / Nhược: ...
2. **<B>** — Ưu: ... / Nhược: ...

### Quyết định
Chọn <X>.

### Lý do
Gắn với ràng buộc thật của dự án, không phải ưu điểm chung chung của công nghệ.

### Hệ quả
**Tích cực:** ...
**Tiêu cực / cái giá phải trả:** ...
**Cái này khóa chúng ta vào đâu:** ...

### Khi nào nên xem lại quyết định này
Điều kiện cụ thể sẽ khiến quyết định này không còn đúng.
Ví dụ: "khi số từ vựng vượt 50.000" hoặc "khi có người dùng thứ hai".
```

Mục **"Cái giá phải trả"** và **"Khi nào nên xem lại"** là bắt buộc. Một ADR chỉ liệt kê
ưu điểm của lựa chọn đã chọn là quảng cáo, không phải tài liệu kỹ thuật.

## Bước 4 — Chèn vào cuối docs/DECISIONS.md

Giữ thứ tự tăng dần theo số ADR. Không sửa nội dung ADR cũ.
