#!/usr/bin/env node
/**
 * PreToolUse hook — chặn ghi vào những file không bao giờ được sửa bằng tay.
 *
 * Giao thức hook của Claude Code:
 *   - nhận JSON qua stdin
 *   - exit 0  → cho phép
 *   - exit 2  → CHẶN, và nội dung stderr được đưa lại cho Claude đọc
 *
 * Đây là lớp cưỡng chế bằng máy. Quy tắc ghi trong tài liệu có thể bị bỏ qua;
 * quy tắc ở đây thì không.
 */

const RULES = [
  {
    test: (p) => /\/prisma\/migrations\//.test(p),
    message:
      'CHẶN: không được sửa file migration đã sinh ra.\n' +
      'File trong prisma/migrations/ là lịch sử đã xảy ra của database.\n' +
      'Muốn thay đổi schema → sửa schema.prisma rồi chạy:\n' +
      '  npx prisma migrate dev --name <ten_mo_ta_hanh_dong>',
  },
  {
    test: (p) => /(^|\/)\.env(\.local|\.production|\.development)?$/.test(p),
    message:
      'CHẶN: không được ghi vào file .env (chứa giá trị thật).\n' +
      'Nếu cần thêm biến môi trường mới:\n' +
      '  1. Thêm vào .env.example với giá trị giả\n' +
      '  2. Báo cho con người tự điền giá trị thật vào .env',
  },
  {
    test: (p) => /\/node_modules\//.test(p),
    message:
      'CHẶN: không được sửa file trong node_modules.\n' +
      'Thay đổi ở đó sẽ biến mất sau npm install. Nếu cần vá một package,\n' +
      'hãy báo cáo vấn đề để con người quyết định (patch-package hoặc đổi thư viện).',
  },
  {
    test: (p) => /\/components\/ui\//.test(p) && /\.tsx?$/.test(p),
    message:
      'CẢNH BÁO — CHẶN: frontend/src/components/ui/ là component do shadcn/ui sinh ra.\n' +
      'Sửa trực tiếp sẽ mất khi chạy lại lệnh add. Hãy tạo wrapper component riêng\n' +
      'trong components/ thay vì sửa file gốc. Nếu thật sự cần sửa, con người tự sửa.',
  },
  {
    test: (p) => /(^|\/)(package-lock\.json|pnpm-lock\.yaml|yarn\.lock)$/.test(p),
    message:
      'CHẶN: không được sửa lockfile bằng tay.\n' +
      'Lockfile do npm sinh ra. Dùng lệnh npm install / npm uninstall.',
  },
];

let raw = '';
process.stdin.setEncoding('utf8');
process.stdin.on('data', (chunk) => {
  raw += chunk;
});
process.stdin.on('end', () => {
  let input;
  try {
    input = JSON.parse(raw);
  } catch {
    // Không đọc được input thì không chặn — hook hỏng không được làm kẹt công việc.
    process.exit(0);
  }

  const filePath = input?.tool_input?.file_path ?? input?.tool_input?.notebook_path ?? '';
  if (!filePath) process.exit(0);

  const normalized = String(filePath).replace(/\\/g, '/');

  for (const rule of RULES) {
    if (rule.test(normalized)) {
      process.stderr.write(`${rule.message}\n\nFile bị chặn: ${filePath}\n`);
      process.exit(2);
    }
  }

  process.exit(0);
});
