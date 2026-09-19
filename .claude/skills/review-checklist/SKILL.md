---
name: review-checklist
description: Danh sách kiểm tra khi review code trong dự án này — tính đúng đắn, tuân thủ contract, N+1 query, kỷ luật kiến trúc, và cách phân loại mức độ nghiêm trọng. Dùng khi review code, tự kiểm tra trước khi đóng phase, hoặc khi đánh giá pull request.
---

# Checklist review code

## Nguyên tắc: mỗi phát hiện phải có kịch bản thất bại cụ thể

Trước khi ghi một mục vào báo cáo, trả lời được: **input nào → hậu quả gì?**

Nếu không trả lời được, đó là linh cảm chứ không phải phát hiện. Một báo cáo 3 mục chính
xác có giá trị hơn 15 mục mơ hồ, vì con người sẽ đọc hết 3 mục và bỏ qua cả 15 mục.

Trước khi khẳng định một hàm bị gọi sai, **đọc định nghĩa hàm đó**. Đừng suy đoán từ tên hàm.

## 1. Tính đúng đắn

- [ ] `null` / `undefined` / mảng rỗng có được xử lý không?
- [ ] Có `await` bị quên không? (dấu hiệu: hàm `async` gọi hàm `async` mà không `await`)
- [ ] `try/catch` có nuốt lỗi im lặng không? (`catch {}` hoặc `catch (e) { console.log(e) }`)
- [ ] Thao tác nhiều bảng có cần transaction không?
      Ví dụ bắt buộc: tạo Vocabulary + gắn vào Collection; xóa hết rồi thêm lại quan hệ N-N.
- [ ] So sánh chuỗi có phân biệt hoa thường ngoài ý muốn không? (tìm từ trùng)
- [ ] Phép tính ngày tháng có tính đến múi giờ không? (Dashboard "hôm nay" — theo giờ nào?)
- [ ] Chia cho 0 khi tính tỷ lệ đúng/sai lúc `reviewCount = 0`?

## 2. Tuân thủ contract

- [ ] URL, method, status code khớp `docs/API.md`?
- [ ] Endpoint danh sách trả về envelope `{ items, total, page, limit, totalPages }`?
- [ ] DTO validate đủ? Field `@IsOptional()` có thật sự optional về mặt nghiệp vụ không?
- [ ] `@Max(100)` cho `limit`? `@Min(1)` cho `page`?
- [ ] `sort` được whitelist hay nhận chuỗi tùy ý từ client?
- [ ] Response có lộ field không nên lộ không?
- [ ] 404 được trả cho "không tìm thấy", hay đang để lọt thành 500?

## 3. Hiệu năng

- [ ] **N+1 query** — có vòng lặp nào gọi Prisma bên trong không?
      Đây là lỗi hay gặp nhất với ORM. Dấu hiệu: `for`/`map` chứa `await prisma.`
      Cách sửa: `include`, hoặc một `findMany({ where: { id: { in: ids } } })`.
- [ ] Có `findMany` nào không `take`/`skip` không?
- [ ] `include` có kéo về dữ liệu không dùng đến không? (dùng `select` để lấy đúng cột cần)
- [ ] Đếm số lượng bằng `_count` hay bằng cách load hết rồi `.length`?
- [ ] Cột dùng trong `where` / `orderBy` đã có index chưa?
- [ ] Frontend có gọi API trong vòng lặp render không?
- [ ] `queryKey` của TanStack Query có ổn định không? (object tạo mới inline → fetch vô hạn)

## 4. Kỷ luật kiến trúc — riêng của dự án này

- [ ] **Mọi truy vấn Prisma trên dữ liệu người dùng có `ownerId` trong `where`?**
- [ ] Dùng `findFirst({ id, ownerId })` chứ không phải `findUnique({ id })`?
- [ ] Frontend có import `@prisma/client` không? (phải là **không**)
- [ ] Business logic có lọt vào Controller không? (Controller mỗi method nên dưới 10 dòng)
- [ ] Có gọi Prisma trực tiếp từ Controller không?
- [ ] Có `any` nào lọt vào không?
- [ ] Có secret hard-code không?
- [ ] Có module/bảng/entity nào được tạo mà phase hiện tại chưa dùng đến không?

## 5. Đơn giản hóa

- [ ] Có abstraction nào được tạo cho **một** trường hợp dùng duy nhất không?
- [ ] Có code trùng lặp đáng kể với module đã có không? (đối chiếu với `languages/`)
- [ ] Có tham số nào luôn được truyền cùng một giá trị không?
- [ ] Có nhánh `if` nào không bao giờ chạy tới không?
- [ ] Có thể xóa bớt dòng nào mà hành vi không đổi không?

## 6. Khả năng đọc

- [ ] Tên biến/hàm nói đúng việc nó làm?
- [ ] Comment có mô tả *dòng code bên dưới đang làm gì* không? (nếu có → nên xóa;
      comment chỉ để nói **ràng buộc** mà code không tự thể hiện được)
- [ ] Hàm dài quá 50 dòng có làm nhiều hơn một việc không?
- [ ] Code mới có giống style code xung quanh không?

## Phân loại mức độ

| Mức | Tiêu chí | Hành động |
|---|---|---|
| **NGHIÊM TRỌNG** | Sai dữ liệu, mất dữ liệu, crash, lộ dữ liệu giữa các owner | Chặn gate — phải sửa |
| **ĐÁNG CHÚ Ý** | Chạy được nhưng sai contract, N+1, thiếu validate, xử lý lỗi kém | Con người quyết định |
| **NHỎ** | Đặt tên, trùng lặp, có thể đơn giản hơn | Có thể hoãn, ghi vào TODO |

## Những gì KHÔNG phải việc của review

- **Format code** — Prettier lo. Đừng báo cáo khoảng trắng, dấu chấm phẩy.
- **Sở thích cá nhân** — `map` vs `for`, arrow function vs function declaration.
  Nếu không có kịch bản thất bại, đó là sở thích.
- **Refactor toàn bộ** — đề xuất hướng sửa, không viết lại module.

## Kết thúc review

Luôn nêu rõ **phạm vi đã đọc** và **phạm vi chưa đọc**. Một báo cáo "không có vấn đề" mà
không nói rõ đã đọc những file nào tạo ra cảm giác an toàn giả — con người sẽ tưởng toàn
bộ code đã được kiểm tra.

Nếu không tìm thấy vấn đề nghiêm trọng nào, nói thẳng như vậy. **Không bịa ra phát hiện
cho đủ số lượng.** Một lần review sạch là kết quả hợp lệ.
