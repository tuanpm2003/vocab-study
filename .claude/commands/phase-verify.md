---
description: Chạy Quality Gate G1-G4 — build, test, review chéo và rà soát bảo mật song song, rồi tổng hợp kết quả
argument-hint: [phạm vi cần kiểm tra, ví dụ "module languages"]
---

Chạy Quality Gate cho phần code vừa hoàn thành. Phạm vi: $ARGUMENTS

## G1 — Build Gate (làm trước, một mình)

Chạy và dán **output thật**:

```
cd backend;  npm run build
cd backend;  npm run lint
cd frontend; npm run build
cd frontend; npm run lint
```

**Nếu G1 fail → DỪNG TẠI ĐÂY.** Không gọi agent nào cả. Báo lỗi cho con người và sửa trước.
Gọi reviewer đi review code chưa compile được là lãng phí.

## G2-G4 — Chạy SONG SONG

Nếu G1 pass, gọi **ba subagent cùng lúc trong một message** (quan trọng: cùng một message
thì chúng chạy song song):

1. `tester` — viết/chạy test, báo cáo bug.
2. `reviewer` — review chéo tính đúng đắn, contract, hiệu năng.
3. `security` — rà soát bảo mật, đặc biệt là cách ly `ownerId`.

Mỗi agent nhận đúng phạm vi $ARGUMENTS và danh sách file đã thay đổi. Cho chúng biết
nhánh/diff hiện tại bằng `git diff --stat main...HEAD` nếu đang ở nhánh feature.

## Tổng hợp

Khi cả ba xong, gộp phát hiện lại. Không dán nguyên ba báo cáo — con người không đọc nổi.
Trình bày:

```
# Quality Gate — kết quả

| Gate | Trạng thái |
|---|---|
| G1 Build/Lint | ✅ / ❌ |
| G2 Test       | ✅ / ❌  (X passed, Y failed) |
| G3 Review     | ✅ / ❌  (n nghiêm trọng, n đáng chú ý) |
| G4 Security   | ✅ / ❌  (n cao, n trung bình) |

## PHẢI SỬA trước khi qua gate
1. [nguồn: reviewer] <file:line> — <vấn đề> — <kịch bản thất bại>
...

## NÊN SỬA — con người quyết định
...

## Ghi vào docs/TODO.md, chưa làm bây giờ
...

## Trùng lặp giữa các agent
<nếu hai agent cùng chỉ ra một vấn đề, gộp lại và ghi chú — đó là tín hiệu mạnh>

## Bất đồng giữa các agent
<nếu có, nêu rõ và đưa đánh giá của bạn>
```

## Sau đó — DỪNG LẠI

**Không tự động sửa các phát hiện.** Con người đọc, quyết định cái nào sửa, cái nào hoãn,
cái nào bác bỏ. Kết thúc bằng:

*"Bạn muốn tôi sửa mục nào? (số thứ tự, hoặc 'tất cả PHẢI SỬA')"*

Ngoại lệ duy nhất: nếu tất cả gate đều pass và không có phát hiện nào ở mức PHẢI SỬA,
nói rõ *"Tất cả Quality Gate đã pass. Còn lại G5 — bạn chạy thử app."*
