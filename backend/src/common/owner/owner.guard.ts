import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Request } from 'express';
import type { EnvironmentVariables } from '../../config/env.validation.js';

export interface RequestWithOwner extends Request {
  ownerId?: string;
}

/**
 * MVP một người dùng: mọi request thuộc về LOCAL_OWNER_ID.
 * Phase 12 thay guard này bằng JWT guard gán `ownerId` từ token —
 * `@CurrentUser()` và mọi chữ ký service giữ nguyên.
 */
@Injectable()
export class OwnerGuard implements CanActivate {
  constructor(
    private readonly config: ConfigService<EnvironmentVariables, true>,
  ) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<RequestWithOwner>();
    request.ownerId = this.config.get('LOCAL_OWNER_ID', { infer: true });
    return true;
  }
}
