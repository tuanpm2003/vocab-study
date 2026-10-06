import { registerDecorator, type ValidationOptions } from 'class-validator';

/**
 * Giới hạn kích thước một object JSON tự do (đo bằng byte UTF-8 sau khi serialize).
 * `extra` không có schema cố định, nên không có giới hạn này thì một request có thể
 * nhét hàng MB vào một dòng.
 */
export function MaxJsonBytes(max: number, options?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      name: 'maxJsonBytes',
      target: object.constructor,
      propertyName,
      constraints: [max],
      options: {
        message: `${propertyName} không được vượt quá ${max} byte`,
        ...options,
      },
      validator: {
        validate(value: unknown): boolean {
          return Buffer.byteLength(JSON.stringify(value) ?? '', 'utf8') <= max;
        },
      },
    });
  };
}
