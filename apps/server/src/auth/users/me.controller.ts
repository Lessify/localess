import { Body, Controller, Get, HttpCode, Patch, Put } from '@nestjs/common';
import { z } from 'zod';
import { AuthService } from '../auth.service.js';
import { PASSWORD_MIN_LENGTH } from '../password.js';
import { CurrentSessionId, CurrentUser } from '../request-context.js';
import { SessionService } from '../session.service.js';
import { ZodValidationPipe } from '../../infra/http/zod-validation.pipe.js';
import { EventsService } from '../../infra/events/events.service.js';
import { UserDto, type UserRow, UsersService } from './users.service.js';

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
  constructor(
    private readonly users: UsersService,
    private readonly auth: AuthService,
    private readonly sessions: SessionService,
    private readonly events: EventsService,
  ) {}

  @Get()
  async get(@CurrentUser() user: UserRow): Promise<UserDto> {
    return this.users.toDto(user);
  }

  @Patch()
  async updateProfile(
    @CurrentUser() user: UserRow,
    @Body(new ZodValidationPipe(profileSchema)) body: z.infer<typeof profileSchema>,
  ): Promise<UserDto> {
    const updated = await this.users.updateProfile(user.id, body);
    await this.events.publish({ spaceId: null, entity: 'users', id: user.id, op: 'updated' });
    return this.users.toDto(updated);
  }

  @Put('email')
  async updateEmail(
    @CurrentUser() user: UserRow,
    @Body(new ZodValidationPipe(emailSchema)) body: z.infer<typeof emailSchema>,
  ): Promise<UserDto> {
    await this.auth.confirmCurrentPassword(user, body.currentPassword);
    const updated = await this.users.updateEmail(user.id, body.email);
    await this.events.publish({ spaceId: null, entity: 'users', id: user.id, op: 'updated' });
    return this.users.toDto(updated);
  }

  /** Changing the password signs out every other session. */
  @Put('password')
  @HttpCode(204)
  async updatePassword(
    @CurrentUser() user: UserRow,
    @CurrentSessionId() sessionId: string,
    @Body(new ZodValidationPipe(passwordSchema)) body: z.infer<typeof passwordSchema>,
  ): Promise<void> {
    await this.auth.confirmCurrentPassword(user, body.currentPassword);
    await this.users.setPassword(user.id, body.newPassword);
    await this.sessions.revokeAllForUser(user.id, sessionId);
  }
}
