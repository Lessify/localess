import { Body, Controller, Delete, Get, HttpCode, Inject, Param, Patch, Post, Query, Req } from '@nestjs/common';
import { zUserInvite, zUserPageable, zUserStatusUpdate, zUserUpdate } from '@localess/shared/zod';
import type { FastifyRequest } from 'fastify';
import { type Page, type UserInvite, type UserPageable, UserPermission, type UserStatusUpdate, type UserUpdate } from '@localess/shared';
import { RequirePermission } from '../../../auth/decorators.js';
import { CurrentUser } from '../../../auth/request-context.js';
import { publicOrigin } from '../../../auth/utils/public-url.js';
import { APP_CONFIG, type AppConfig } from '../../../infra/config/config.js';
import { UuidParamPipe } from '../../../infra/http/uuid-param.pipe.js';
import type { UserRow } from '../../../shared/models/user.js';
import type { UserDto } from '../../../shared/transformers/user.transformer.js';
import { UserService } from '../services/user.service.js';

/**
 * Admin → Users. Enforces what firestore.rules enforced on `users/{uid}` plus the `user.invite`
 * callable: USER_MANAGEMENT to get in, `canGrant` for what may be given, `canManageUser` for who may
 * be changed or removed.
 */
@Controller('api/app/users')
@RequirePermission(UserPermission.USER_MANAGEMENT)
export class UserController {
  constructor(
    private readonly users: UserService,
    @Inject(APP_CONFIG) private readonly config: AppConfig,
  ) {}

  /** One page: `?page=&size=&sort=&direction=` (Pageable), `?search=` (email or display name), `?active=active|inactive`. */
  @Get()
  findAll(@Query({ schema: zUserPageable }) query: UserPageable): Promise<Page<UserDto>> {
    return this.users.findAll(query);
  }

  @Get(':id')
  async findOne(@Param('id', UuidParamPipe) id: string): Promise<UserDto> {
    return this.users.findOne(id);
  }

  @Post()
  async invite(
    @CurrentUser() caller: UserRow,
    @Body({ schema: zUserInvite }) body: UserInvite,
  ): Promise<UserDto> {
    return this.users.invite(caller, body);
  }

  @Patch(':id')
  async updateAccess(
    @CurrentUser() caller: UserRow,
    @Param('id', UuidParamPipe) id: string,
    @Body({ schema: zUserUpdate }) body: UserUpdate,
  ): Promise<UserDto> {
    return this.users.changeAccess(caller, id, body);
  }

  /** Blocks (or restores) sign-in without deleting the user; was the Firebase Auth console's "Disable account". */
  @Patch(':id/status')
  async updateStatus(
    @CurrentUser() caller: UserRow,
    @Param('id', UuidParamPipe) id: string,
    @Body({ schema: zUserStatusUpdate }) body: UserStatusUpdate,
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
  async remove(@CurrentUser() caller: UserRow, @Param('id', UuidParamPipe) id: string): Promise<void> {
    await this.users.remove(caller, id);
  }
}
