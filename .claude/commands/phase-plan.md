---
description: Lập kế hoạch cho một Phase theo Mentor Mode 10 mục, và dừng lại chờ duyệt (Quality Gate G0)
argument-hint: <số phase> [ghi chú thêm]
---

Lập kế hoạch cho **Phase $1** của dự án. $ARGUMENTS

## Bước 1 — Đọc ngữ cảnh

Đọc `CLAUDE.md`, `docs/WORKFLOW.md`, **`docs/PLAN.md`**, `docs/TODO.md`, và các file
`docs/` liên quan đến phase này (`ARCHITECTURE.md`, `DATABASE.md`, `API.md`). Nếu phase này
có liên quan đến code đã viết, đọc code đó — đừng suy đoán.

Trong `docs/PLAN.md`, tìm nhóm chức năng (F*) thuộc Phase $1. **Danh sách task của nhóm đó
là phạm vi của phase.** Kế hoạch phải bám theo các task ID này (ví dụ mục 5 "Code" chia
bước theo `F1-01`, `F1-02`...). Nếu thấy cần thêm hoặc bỏ task, đề xuất ở cuối kế hoạch để
con người duyệt, đừng tự sửa PLAN.md ở bước này.

## Bước 2 — Quyết định có cần architect không

Nếu phase này **có** ít nhất một trong các yếu tố sau, hãy gọi subagent `architect` trước:
- Thay đổi Prisma schema.
- Thêm hoặc đổi API contract.
- Có nhiều hơn một cách làm hợp lý và lựa chọn khó đảo ngược.
- Đưa thêm thư viện/dịch vụ mới vào stack.

Nếu không có yếu tố nào, tự lập kế hoạch — đừng gọi agent cho việc đã rõ ràng.

## Bước 3 — Trình bày kế hoạch theo đúng 10 mục Mentor Mode

```
# PHASE $1 — <tên>

## 1. Chúng ta đang xây dựng gì?
## 2. Tại sao cần xây dựng nó?
## 3. Kiến thức cần biết trước
     (giải thích khái niệm mới TRƯỚC khi dùng nó — đây là mục quan trọng nhất)
## 4. Files sẽ tạo / thay đổi
     (dạng bảng: đường dẫn | tạo hay sửa | mục đích)
## 5. Code
     (chia thành từng bước nhỏ, mỗi bước giải thích trước rồi mới tới code)
## 6. Cách chạy
     (lệnh PowerShell cụ thể, nói rõ chạy ở thư mục nào)
## 7. Cách test
## 8. Kết quả mong đợi
     (mô tả cụ thể bạn sẽ THẤY gì trên màn hình / trong Prisma Studio)
## 9. Những lỗi thường gặp
## 10. Tôi nên hiểu được gì sau Phase này?
```

## Bước 4 — DỪNG LẠI

Sau khi trình bày kế hoạch, **không được bắt đầu code**.

Kết thúc bằng:
1. Danh sách **các quyết định cần con người duyệt** (nếu có).
2. Câu: *"Đây là Quality Gate G0. Xác nhận kế hoạch để tôi bắt đầu implement."*

Nếu kế hoạch dài hơn khoảng 6 bước code, hãy chia phase thành 2 phần và chỉ lập kế hoạch
cho phần 1. Một phase quá lớn thì con người không review nổi, và Quality Gate trở thành
hình thức.
