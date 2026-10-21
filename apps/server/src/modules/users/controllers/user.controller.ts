import {
  ADMINS,
  type Page,
  type PasswordResetLink,
  type User,
  type UserInvite,
  type UserPageable,
  type UserStatusUpdate,
  type UserUpdate,
} from '@localess/shared';
import { zUserInvite, zUserPageable, zUserStatusUpdate, zUserUpdate } from '@localess/shared/zod';
import { Body, Controller, Delete, Get, HttpCode, Inject, Param, Patch, Post, Query, Req } from '@nestjs/common';
import type { FastifyRequest } from 'fastify';

import { RequireRole } from '../../../auth/decorators.js';
import { CurrentUser } from '../../../auth/request-context.js';
import { publicOrigin } from '../../../auth/utils/public-url.js';
import { APP_CONFIG, type AppConfig } from '../../../infra/config/config.js';
import { UuidParamPipe } from '../../../infra/http/uuid-param.pipe.js';
import type { UserEntity } from '../../../shared/entities/user.entity.js';
import { UserService } from '../services/user.service.js';

/** Admin → Users, for admins only: invite, change a user's role, disable, hand a reset link, delete. */
@Controller('api/app/users')
@RequireRole(ADMINS)
export class UserController {
  constructor(
    private readonly userService: UserService,
    @Inject(APP_CONFIG) private readonly config: AppConfig,
  ) {}

  /** One page: `?page=&size=&sort=&direction=` (Pageable), `?search=` (email or display name), `?active=active|inactive`. */
  @Get()
  findAll(@Query({ schema: zUserPageable }) query: UserPageable): Promise<Page<User>> {
    return this.userService.findAll(query);
  }

  @Get(':id')
  async findOne(@Param('id', UuidParamPipe) id: string): Promise<User> {
    return this.userService.findOne(id);
  }

  @Post()
  async create(@Body({ schema: zUserInvite }) body: UserInvite): Promise<User> {
    return this.userService.create(body);
  }

  @Patch(':id')
  async update(@Param('id', UuidParamPipe) id: string, @Body({ schema: zUserUpdate }) body: UserUpdate): Promise<User> {
    return this.userService.update(id, body);
  }

  /** Blocks (or restores) sign-in without deleting the user. */
  @Patch(':id/status')
  async updateStatus(
    @CurrentUser() caller: UserEntity,
    @Param('id', UuidParamPipe) id: string,
    @Body({ schema: zUserStatusUpdate }) body: UserStatusUpdate,
  ): Promise<User> {
    return this.userService.updateStatus(caller, id, body);
  }

  /** A one-hour reset link to hand to the user — the way to reset passwords when SMTP isn't configured. */
  @Post(':id/password-reset-link')
  async createPasswordResetLink(@Param('id', UuidParamPipe) id: string, @Req() request: FastifyRequest): Promise<PasswordResetLink> {
    return this.userService.createPasswordResetLink(id, publicOrigin(this.config, request));
  }

  @Delete(':id')
  @HttpCode(204)
  async remove(@Param('id', UuidParamPipe) id: string): Promise<void> {
    await this.userService.remove(id);
  }
}
