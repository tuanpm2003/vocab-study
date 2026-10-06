import { Prisma } from '../generated/prisma/client.js';

/** P2002 = vi phạm ràng buộc unique. */
export function isUniqueViolation(error: unknown): boolean {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === 'P2002'
  );
}
