import { Body, Controller, Get, HttpCode, Patch, Put } from '@nestjs/common';
import { z } from 'zod';
import { PASSWORD_MIN_LENGTH } from '../../../auth/utils/password.js';
import { CurrentSessionId, CurrentUser } from '../../../auth/request-context.js';
import { ZodValidationPipe } from '../../../infra/http/zod-validation.pipe.js';
import type { UserRow } from '../../../shared/models/user.js';
import type { UserDto } from '../../../shared/transformers/user.transformer.js';
import { MeService } from '../services/me.service.js';

const profileSchema = z.object({
  displayName: z.string().trim().max(200).nullish(),
  photoURL: z.string().trim().url().max(2048).or(z.literal('')).nullish(),
});

const emailSchema = z.object({
  email: z.string().trim().email(),
  currentPassword: z.string().optional(),
});

const passwordSchema = z.object({
  currentPassword: z.string().optional(),
  newPassword: z.string().min(PASSWORD_MIN_LENGTH),
});

/** The signed-in user's own profile (was `updateProfile` / `updateEmail` / `updatePassword` on Firebase Auth). */
@Controller('api/app/me')
export class MeController {
  constructor(private readonly me: MeService) {}

  @Get()
  async get(@CurrentUser() user: UserRow): Promise<UserDto> {
    return this.me.get(user);
  }

  @Patch()
  async updateProfile(
    @CurrentUser() user: UserRow,
    @Body(new ZodValidationPipe(profileSchema)) body: z.infer<typeof profileSchema>,
  ): Promise<UserDto> {
    return this.me.updateProfile(user, body);
  }

  @Put('email')
  async updateEmail(
    @CurrentUser() user: UserRow,
    @Body(new ZodValidationPipe(emailSchema)) body: z.infer<typeof emailSchema>,
  ): Promise<UserDto> {
    return this.me.updateEmail(user, body.email, body.currentPassword);
  }

  /** Changing the password signs out every other session. */
  @Put('password')
  @HttpCode(204)
  async updatePassword(
    @CurrentUser() user: UserRow,
    @CurrentSessionId() sessionId: string,
    @Body(new ZodValidationPipe(passwordSchema)) body: z.infer<typeof passwordSchema>,
  ): Promise<void> {
    await this.me.updatePassword(user, sessionId, body.currentPassword, body.newPassword);
  }
}
