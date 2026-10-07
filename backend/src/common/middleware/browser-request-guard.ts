import type { NextFunction, Request, Response } from 'express';

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

function reject(res: Response, req: Request, status: number, message: string) {
  res.status(status).json({
    statusCode: status,
    message,
    error: status === 403 ? 'Forbidden' : 'Unsupported Media Type',
    path: req.path,
    timestamp: new Date().toISOString(),
  });
}

/**
 * Chặn request GHI (POST/PATCH/DELETE…) do một trang web KHÁC phát ra từ trình duyệt của
 * người dùng — tấn công CSRF.
 *
 * Vì sao cookie `sameSite=lax` chưa đủ:
 *  - `/auth/register` và `/auth/login` là route công khai, không cần cookie nào.
 *  - "site" không phải "origin": mọi cổng khác trên localhost (và mọi subdomain anh em khi lên
 *    mạng) đều cùng site với app, nên cookie vẫn được gửi kèm.
 *  - Express nhận cả body dạng form (`application/x-www-form-urlencoded`), thứ mà thẻ <form>
 *    của bất kỳ trang nào cũng gửi được mà không qua kiểm tra CORS.
 *
 * Hai chốt, cả hai đều rẻ:
 *  1. `Origin`: trình duyệt LUÔN gắn header này vào request ghi chéo origin và JavaScript trên
 *     trang không sửa được nó. Có `Origin` mà khác origin của frontend → từ chối.
 *     (Client không phải trình duyệt — curl, test — không gửi `Origin`; chúng cũng không mang
 *     cookie của ai nên không phải là mối nguy CSRF.)
 *  2. `Content-Type`: body phải là JSON. Thẻ <form> không tạo ra được `application/json`.
 */
export function browserRequestGuard(allowedOrigin: string) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (SAFE_METHODS.has(req.method)) return next();

    const origin = req.headers.origin;
    if (origin !== undefined && origin !== allowedOrigin) {
      return reject(res, req, 403, 'Request từ nguồn không được phép');
    }

    const hasBody =
      Number(req.headers['content-length'] ?? 0) > 0 ||
      req.headers['transfer-encoding'] !== undefined;
    if (hasBody && !req.is('application/json')) {
      return reject(res, req, 415, 'Body phải là application/json');
    }
    next();
  };
}
