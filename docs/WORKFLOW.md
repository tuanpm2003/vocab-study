# WORKFLOW — Quy trình AI-assisted Software Engineering

> Tài liệu này mô tả **cách con người và AI làm việc cùng nhau** trong dự án.
> Mục tiêu KHÔNG phải là để AI tự động làm mọi thứ. Mục tiêu là một quy trình
> **có kiểm soát, có kiểm thử, có review chéo, và có Quality Gate** — trong đó
> con người luôn là người quyết định.

---

## 1. Nguyên tắc nền tảng

### Con người ở đâu trong quy trình?

```
Con người  →  quyết định, duyệt, hiểu code, chạy thử
AI chính   →  giải thích + viết code (để con người học được)
Subagent   →  kiểm chứng: test, review chéo, bảo mật
```

Ba nguyên tắc không được vi phạm:

**(1) AI không tự chuyển phase.** Mỗi phase bắt đầu bằng việc con người gõ `/phase-plan`,
và kết thúc bằng việc con người gõ `/phase-close`. Không có chế độ "chạy hết roadmap".

**(2) Code mới do session chính viết, không do subagent viết.**
Đây là điểm đi ngược trực giác nên cần giải thích. Subagent làm việc trong ngữ cảnh riêng
và chỉ trả về kết quả cuối — bạn **không nhìn thấy** quá trình suy nghĩ của nó. Nếu subagent
viết toàn bộ code, bạn nhận được một đống file đã hoàn thành mà không học được gì, và
Quality Gate G5 ("tôi có hiểu code này không") sẽ luôn fail.

Subagent `coder` chỉ dùng cho việc **cơ học đã có mẫu** — ví dụ: sau khi bạn đã hiểu
pattern CRUD qua module `languages`, việc áp cùng pattern đó cho `levels` và `collections`
không dạy bạn thêm gì, nên giao cho subagent là hợp lý.

**(3) Ai viết code thì không được tự chấm điểm code đó.** Đây là lý do `reviewer`,
`security`, `tester` là các subagent riêng biệt với ngữ cảnh sạch. Một model vừa viết
xong một đoạn code có xu hướng thấy nó hợp lý — nó vừa tự thuyết phục mình rằng cách đó
đúng. Một model khác, không biết gì về quá trình đó, chỉ nhìn thấy code như nó thật sự là.

---

## 2. Vòng lặp một Phase

```
┌─ G0 ─ THIẾT KẾ ────────────────────────────────────────┐
│  Bạn gõ:  /phase-plan <n>                              │
│  AI:      đọc docs → (gọi architect nếu cần) → trình    │
│           bày kế hoạch 10 mục → DỪNG                    │
│  Bạn:     đọc, hỏi lại, duyệt hoặc yêu cầu sửa          │
│  ⛔ GATE: AI không code cho tới khi bạn duyệt            │
└────────────────────────────────────────────────────────┘
                          ↓
┌─ IMPLEMENT ────────────────────────────────────────────┐
│  Session chính viết code, từng bước một.                │
│  Mỗi bước: giải thích TRƯỚC → code SAU.                 │
│  Mỗi task xong → cập nhật ngay docs/PLAN.md (✅ + nhật ký)│
│  Bạn dừng bất cứ lúc nào để hỏi: /explain <gì đó>       │
└────────────────────────────────────────────────────────┘
                          ↓
┌─ G1..G4 ─ KIỂM CHỨNG ──────────────────────────────────┐
│  Bạn gõ:  /phase-verify                                 │
│  G1 build + lint         (session chính chạy)           │
│  G2 tester   ┐                                          │
│  G3 reviewer ├─ chạy SONG SONG, ngữ cảnh độc lập        │
│  G4 security ┘                                          │
│  AI tổng hợp → DỪNG                                     │
│  ⛔ GATE: AI không tự sửa. Bạn chọn sửa gì.              │
└────────────────────────────────────────────────────────┘
                          ↓
┌─ G5 ─ CON NGƯỜI ───────────────────────────────────────┐
│  Bạn tự chạy app. Bạn tự bấm thử.                       │
│  Bạn tự hỏi: "tôi có hiểu code này không?"              │
│  ⛔ GATE: đây là gate duy nhất AI không thể tự xác nhận  │
└────────────────────────────────────────────────────────┘
                          ↓
┌─ ĐÓNG PHASE ───────────────────────────────────────────┐
│  Bạn gõ:  /phase-close <n> <tên>                        │
│  AI: cập nhật docs, CHANGELOG, TODO, roadmap → commit   │
└────────────────────────────────────────────────────────┘
```

Chi tiết từng gate ở [QUALITY_GATES.md](QUALITY_GATES.md).

---

## 3. Đội ngũ — ai làm gì

### Session chính (cửa sổ bạn đang chat)

Vừa là **orchestrator** vừa là **mentor** vừa là **người viết code mới**.

Đây là lý do **không có agent `orchestrator.md`**. Một subagent điều phối các subagent
khác sẽ đẩy bạn ra khỏi vòng lặp — nó nhận yêu cầu, tự chạy cả pipeline, rồi trả về kết
quả cuối. Đúng bằng cách đó, mọi Quality Gate biến thành hình thức: không ai dừng lại chờ
bạn duyệt, vì "người duyệt" cũng là AI. Orchestration trong dự án này nằm ở các slash
command mà **bạn gõ** — bạn chính là bộ điều phối.

### Subagent

| Agent | Model | Quyền | Dùng khi |
|---|---|---|---|
| `architect` | opus | Đọc + ghi `docs/` | Đổi schema, thiết kế API, có nhiều phương án khó đảo ngược |
| `coder` | sonnet | Đọc + ghi code | Việc cơ học đã có mẫu. **Không** dùng cho code mới lần đầu |
| `tester` | sonnet | Đọc + ghi file test | G2 — viết và chạy test |
| `reviewer` | opus | **Chỉ đọc** | G3 — review chéo tính đúng đắn |
| `security` | opus | **Chỉ đọc** | G4 — rà soát bảo mật |

`reviewer` và `security` **chỉ đọc** là cố ý. Một agent có quyền sửa sẽ bị cám dỗ "tiện tay
sửa luôn" — và khi đó bạn mất bản ghi về việc code đã sai như thế nào, cũng như mất cơ hội
tự quyết định.

### Slash command

| Lệnh | Việc |
|---|---|
| `/phase-plan <n>` | Lập kế hoạch phase, dừng ở G0 |
| `/phase-verify` | Chạy G1-G4, tổng hợp, dừng |
| `/phase-close <n> <tên>` | Cập nhật tài liệu + commit |
| `/explain <gì đó>` | Giải thích khái niệm hoặc code |
| `/adr <tiêu đề>` | Ghi một quyết định kiến trúc |

### Skill

Skill là **tài liệu tham chiếu được nạp khi cần**, không phải nhân vật. Chúng chứa quy
ước cụ thể của dự án (mẫu code NestJS, quy trình migration Prisma, checklist review...)
để cả session chính lẫn subagent đều viết ra code nhất quán.

Danh sách: `project-context`, `backend-nestjs`, `frontend-nextjs`, `database-prisma`,
`api-contract`, `project-testing`, `review-checklist`, `security-checklist`, `aws-deploy`.

---

## 4. Nhánh Git cho mỗi phase

```powershell
git checkout -b feature/phase-2-language-management
# ... làm việc ...
# sau khi /phase-close tạo commit:
git checkout main
git merge feature/phase-2-language-management
git branch -d feature/phase-2-language-management
```

Một nhánh cho một phase. Lợi ích thật sự: `git diff main...HEAD` cho bạn **đúng phạm vi**
mà `reviewer` cần xem — không phải toàn bộ codebase.

---

## 5. Khi có sự cố

### Test fail

Đừng bảo AI "sửa cho test pass". Hỏi: **"test này fail vì test sai hay vì code sai?"**
Đó là hai tình huống khác hẳn nhau, và câu trả lời quyết định sửa ở đâu.

### Reviewer và security nói ngược nhau

Đây là tín hiệu tốt, không phải vấn đề. Yêu cầu session chính trình bày cả hai lập luận
rồi bạn quyết định. Bất đồng giữa hai lớp kiểm tra độc lập thường chỉ ra một chỗ mà
requirement chưa rõ.

### AI tự ý mở rộng phạm vi

Nói thẳng: *"Bạn đã sửa những gì ngoài phạm vi tôi yêu cầu? Hoàn tác chúng."*
Rồi chạy `git diff` để tự kiểm chứng. Đừng tin lời khai — hãy nhìn diff.

### Bạn không hiểu code vừa được viết

**Dừng lại ngay.** Đừng đi tiếp phase sau. Gõ `/explain <file:dòng>`.
Một phase mà bạn không hiểu sẽ trở thành vùng tối trong codebase, và mọi bug ở đó
sau này bạn sẽ phải nhờ AI sửa mà không kiểm chứng được. Đó là lúc quy trình này thất bại.

### Gặp lỗi lúc chạy

Yêu cầu AI trả lời theo đúng bốn bước, không được nhảy thẳng tới bước 3:
1. Nguyên nhân là gì?
2. Tại sao nó xảy ra?
3. Cách sửa.
4. Cách tránh lỗi tương tự lần sau.

---

## 6. Chống những thất bại thường gặp của AI-assisted development

| Kiểu thất bại | Cơ chế phòng vệ trong quy trình này |
|---|---|
| AI viết code trông đúng nhưng sai | `reviewer` + `tester` với ngữ cảnh độc lập (G3, G2) |
| AI báo cáo "đã test, chạy tốt" mà chưa chạy | `tester` bắt buộc dán output thật; bạn tự chạy ở G5 |
| AI tự ý refactor cả project | Quy tắc phạm vi trong `coder.md`; bạn xem `git diff` trước commit |
| Bạn tích lũy code không hiểu | G5 là gate bắt buộc; `/explain` luôn sẵn sàng |
| Lỗ hổng bảo mật lọt qua vì không có triệu chứng | `security` kiểm tra `ownerId` mỗi phase (G4) |
| Quyết định kiến trúc bị quên mất lý do | `/adr` → `docs/DECISIONS.md` |
| Sửa file không được phép sửa | Hook `guard-protected-paths.mjs` chặn ở mức máy |
| Tài liệu lệch khỏi code | `/phase-close` bắt buộc cập nhật tài liệu trước khi commit |
| Phase phình to tới mức không review nổi | `/phase-plan` tự chia nhỏ nếu quá 6 bước |

---

## 7. Điều quan trọng nhất

Quy trình này chỉ có giá trị nếu **bạn thật sự dừng lại ở mỗi gate**.

Nếu bạn bấm qua G0 mà không đọc kế hoạch, bấm qua G3 mà không đọc phát hiện, và bấm qua
G5 mà không chạy app — thì bạn đã xây một quy trình rất công phu để làm đúng một việc:
tạo cảm giác an toàn giả.

Gate chậm là **tính năng**, không phải nhược điểm.
