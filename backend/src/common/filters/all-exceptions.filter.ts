import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { Prisma } from '../../generated/prisma/client.js';

interface ErrorBody {
  statusCode: number;
  message: string | string[];
  error: string;
}

const STATUS_TEXT: Record<number, string> = {
  400: 'Bad Request',
  404: 'Not Found',
  409: 'Conflict',
  500: 'Internal Server Error',
};

// Thông điệp cố định, KHÔNG lấy từ lỗi Prisma: lỗi gốc chứa tên bảng, tên cột,
// đôi khi cả câu SQL.
const PRISMA_ERRORS: Record<string, { status: number; message: string }> = {
  P2002: { status: 409, message: 'Dữ liệu bị trùng với một bản ghi đã có' },
  P2003: {
    status: 409,
    message: 'Bản ghi đang được tham chiếu hoặc tham chiếu không hợp lệ',
  },
  P2025: { status: 404, message: 'Không tìm thấy bản ghi' },
};

function fromHttpException(exception: HttpException): Record<string, unknown> {
  const status = exception.getStatus();
  const response = exception.getResponse();
  if (typeof response === 'string') {
    return {
      statusCode: status,
      message: response,
      error: STATUS_TEXT[status] ?? 'Error',
    };
  }
  return { statusCode: status, ...response };
}

function fromUnknown(exception: unknown): ErrorBody {
  if (exception instanceof Prisma.PrismaClientKnownRequestError) {
    const mapped = PRISMA_ERRORS[exception.code];
    if (mapped) {
      return {
        statusCode: mapped.status,
        message: mapped.message,
        error: STATUS_TEXT[mapped.status] ?? 'Error',
      };
    }
  }
  return {
    statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
    message: 'Lỗi máy chủ',
    error: STATUS_TEXT[500] ?? 'Error',
  };
}

/** Mọi lỗi rời khỏi API đều có cùng một hình dạng (xem skill api-contract). */
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const http = host.switchToHttp();
    const request = http.getRequest<Request>();
    const response = http.getResponse<Response>();

    const body: Record<string, unknown> =
      exception instanceof HttpException
        ? fromHttpException(exception)
        : { ...fromUnknown(exception) };

    const status = Number(body['statusCode']);
    if (status >= 500 && !(exception instanceof HttpException)) {
      // Chi tiết chỉ nằm trong log của server, không bao giờ trả về client.
      this.logger.error(
        `${request.method} ${request.path}`,
        exception instanceof Error ? exception.stack : String(exception),
      );
    }

    response.status(status).json({
      ...body,
      path: request.path,
      timestamp: new Date().toISOString(),
    });
  }
}
