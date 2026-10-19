import { Body, Controller, Delete, Get, HttpCode, Inject, Param, Patch, Post, Query, Req } from '@nestjs/common';
import type { FastifyRequest } from 'fastify';
import { type Page, UserPermission } from '@localess/shared';
import { RequirePermission } from '../../../auth/decorators.js';
import { CurrentUser } from '../../../auth/request-context.js';
import { publicOrigin } from '../../../auth/utils/public-url.js';
import { ZodValidationPipe } from '../../../infra/http/zod-validation.pipe.js';
import { APP_CONFIG, type AppConfig } from '../../../infra/config/config.js';
import { UuidParamPipe } from '../../../infra/http/uuid-param.pipe.js';
import type { UserRow } from '../../../shared/models/user.js';
import type { UserDto } from '../../../shared/transformers/user.transformer.js';
import {
  type UserAccessUpdate,
  type UserInviteInput,
  type UserPageable,
  type UserStatus,
  zUserAccessUpdate,
  zUserInviteInput,
  zUserPageable,
  zUserStatus,
} from '../models/user.models.js';
import { UsersService } from '../services/users.service.js';

/**
 * Admin → Users. Enforces what firestore.rules enforced on `users/{uid}` plus the `user.invite`
 * callable: USER_MANAGEMENT to get in, `canGrant` for what may be given, `canManageUser` for who may
 * be changed or removed.
 */
@Controller('api/app/users')
@RequirePermission(UserPermission.USER_MANAGEMENT)
export class UsersController {
  constructor(
    private readonly users: UsersService,
    @Inject(APP_CONFIG) private readonly config: AppConfig,
  ) {}

  /** One page: `?page=&size=&sort=&direction=` (Pageable), `?search=` (email or display name), `?active=active|inactive`. */
  @Get()
  list(@Query(new ZodValidationPipe(zUserPageable)) query: UserPageable): Promise<Page<UserDto>> {
    return this.users.page(query);
  }

  @Get(':id')
  async get(@Param('id', UuidParamPipe) id: string): Promise<UserDto> {
    return this.users.get(id);
  }

  @Post()
  async invite(
    @CurrentUser() caller: UserRow,
    @Body(new ZodValidationPipe(zUserInviteInput)) body: UserInviteInput,
  ): Promise<UserDto> {
    return this.users.invite(caller, body);
  }

  @Patch(':id')
  async updateAccess(
    @CurrentUser() caller: UserRow,
    @Param('id', UuidParamPipe) id: string,
    @Body(new ZodValidationPipe(zUserAccessUpdate)) body: UserAccessUpdate,
  ): Promise<UserDto> {
    return this.users.changeAccess(caller, id, body);
  }

  /** Blocks (or restores) sign-in without deleting the user; was the Firebase Auth console's "Disable account". */
  @Patch(':id/status')
  async updateStatus(
    @CurrentUser() caller: UserRow,
    @Param('id', UuidParamPipe) id: string,
    @Body(new ZodValidationPipe(zUserStatus)) body: UserStatus,
  ): Promise<UserDto> {
    return this.users.changeStatus(caller, id, body.disabled);
  }

  /** A one-hour reset link to hand to the user — the way to reset passwords when SMTP isn't configured. */
  @Post(':id/password-reset-link')
  async passwordResetLink(
    @CurrentUser() caller: UserRow,
    @Param('id', UuidParamPipe) id: string,
    @Req() request: FastifyRequest,
  ): Promise<{ url: string; expiresAt: string }> {
    const link = await this.users.createPasswordResetLink(caller, id, publicOrigin(this.config, request));
    return { url: link.url, expiresAt: link.expiresAt.toISOString() };
  }

  @Delete(':id')
  @HttpCode(204)
  async delete(@CurrentUser() caller: UserRow, @Param('id', UuidParamPipe) id: string): Promise<void> {
    await this.users.delete(caller, id);
  }
}
