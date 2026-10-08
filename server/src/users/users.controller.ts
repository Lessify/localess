import { Body, Controller, Delete, ForbiddenException, Get, HttpCode, Inject, Param, Patch, Post, Req } from '@nestjs/common';
import type { FastifyRequest } from 'fastify';
import { z } from 'zod';
import { RequirePermission } from '../auth/decorators.js';
import { PASSWORD_MIN_LENGTH } from '../auth/password.js';
import { PasswordResetService } from '../auth/password-reset.service.js';
import { publicOrigin } from '../auth/public-url.js';
import { canGrant, canManageUser, USER_PERMISSIONS, UserPermission } from '../auth/permissions.js';
import { CurrentUser } from '../auth/request-context.js';
import { ZodValidationPipe } from '../common/zod-validation.pipe.js';
import { APP_CONFIG, AppConfig } from '../config/config.js';
import { toPrincipal, UserDto, UserRow, UsersService } from './users.service.js';

const roleSchema = z.enum(['admin', 'custom']).nullish();
const permissionsSchema = z.array(z.enum(USER_PERMISSIONS as [UserPermission, ...UserPermission[]])).optional();

const inviteSchema = z.object({
  email: z.string().trim().email(),
  password: z.string().min(PASSWORD_MIN_LENGTH),
  displayName: z.string().trim().max(200).optional(),
  role: roleSchema,
  permissions: permissionsSchema,
  lock: z.boolean().optional(),
});

const accessSchema = z.object({
  role: roleSchema,
  permissions: permissionsSchema,
  lock: z.boolean().optional(),
});

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
    private readonly passwordReset: PasswordResetService,
    @Inject(APP_CONFIG) private readonly config: AppConfig,
  ) {}

  @Get()
  list(): Promise<UserDto[]> {
    return this.users.list();
  }

  @Get(':id')
  async get(@Param('id') id: string): Promise<UserDto> {
    return this.users.toDto(await this.users.getById(id));
  }

  @Post()
  async invite(
    @CurrentUser() caller: UserRow,
    @Body(new ZodValidationPipe(inviteSchema)) body: z.infer<typeof inviteSchema>,
  ): Promise<UserDto> {
    if (!canGrant(toPrincipal(caller), body.role, body.permissions)) throw new ForbiddenException();
    return this.users.toDto(await this.users.create(body));
  }

  @Patch(':id')
  async updateAccess(
    @CurrentUser() caller: UserRow,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(accessSchema)) body: z.infer<typeof accessSchema>,
  ): Promise<UserDto> {
    const principal = toPrincipal(caller);
    const target = await this.users.getById(id);
    if (!canManageUser(principal, toPrincipal(target)) || !canGrant(principal, body.role, body.permissions)) {
      throw new ForbiddenException();
    }
    return this.users.toDto(await this.users.updateAccess(id, body));
  }

  /** A one-hour reset link to hand to the user — the way to reset passwords when SMTP isn't configured. */
  @Post(':id/password-reset-link')
  async passwordResetLink(
    @CurrentUser() caller: UserRow,
    @Param('id') id: string,
    @Req() request: FastifyRequest,
  ): Promise<{ url: string; expiresAt: string }> {
    const target = await this.users.getById(id);
    if (!canManageUser(toPrincipal(caller), toPrincipal(target))) throw new ForbiddenException();
    const link = await this.passwordReset.createLink(target, publicOrigin(this.config, request));
    return { url: link.url, expiresAt: link.expiresAt.toISOString() };
  }

  @Delete(':id')
  @HttpCode(204)
  async delete(@CurrentUser() caller: UserRow, @Param('id') id: string): Promise<void> {
    const target = await this.users.getById(id);
    if (!canManageUser(toPrincipal(caller), toPrincipal(target))) throw new ForbiddenException();
    // Sessions, credentials and identities cascade.
    await this.users.delete(id);
  }
}
