---
description: Giải thích một khái niệm hoặc một đoạn code trong dự án, theo kiểu mentor — khái niệm trước, code sau
argument-hint: <khái niệm hoặc đường dẫn file:dòng>
---

Giải thích: **$ARGUMENTS**

Nếu đây là một đường dẫn file, hãy đọc file đó trước. Nếu là một khái niệm (Prisma,
Dependency Injection, JSONB, N+1 query...), đừng đọc file nào cả — giải thích trực tiếp.

## Cấu trúc bắt buộc

```
## 1. Nó là gì?
Một đoạn ngắn, không dùng thuật ngữ chưa được giải thích.

## 2. Vấn đề nào khiến người ta tạo ra nó?
Mô tả thế giới TRƯỚC khi có thứ này, và nó khó chịu ở chỗ nào.
Đây là mục quan trọng nhất — hiểu vấn đề rồi thì giải pháp tự nhiên hợp lý.

## 3. Nó hoạt động thế nào?
Từng bước. Nếu có nhiều thành phần, nói rõ cái nào gọi cái nào.

## 4. Trong dự án của chúng ta nó nằm ở đâu?
File cụ thể, dòng cụ thể. Nếu chưa dùng tới thì nói "sẽ dùng ở Phase X".

## 5. Nếu KHÔNG có nó thì sao?
Mô tả code sẽ trông như thế nào nếu làm bằng tay. Đây là cách tốt nhất
để thấy được giá trị thật của một abstraction.

## 6. Khi nào KHÔNG nên dùng?
Mọi công cụ đều có vùng nó không phù hợp. Nói rõ vùng đó.

## 7. Một câu để nhớ
Một câu duy nhất tóm lại bản chất.
```

## Quy tắc

- **Không dùng thuật ngữ chưa giải thích.** Nếu buộc phải dùng, giải thích ngay tại chỗ
  bằng một mệnh đề ngắn.
- **Ưu tiên một ví dụ cụ thể hơn ba câu trừu tượng.** Ví dụ nên dùng chính dữ liệu của
  dự án này: 食べる, 你好, Language/Level/Collection.
- **So sánh với thứ người học đã biết** khi có thể.
- Nếu câu trả lời đúng là "cái này phức tạp hơn bạn cần biết bây giờ" — hãy nói vậy,
  giải thích phần cần biết, và ghi chú phần còn lại sẽ gặp ở phase nào.
- Đừng viết dài để trông có vẻ đầy đủ. Viết đủ để người đọc **tự giải thích lại được**
  cho người khác.
