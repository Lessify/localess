import { ConflictException, Inject, Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { DEFAULT_LOCALE } from '@localess/shared';
import { hashPassword, PASSWORD_MIN_LENGTH } from '../password.js';
import { APP_CONFIG, type AppConfig } from '../../infra/config/config.js';
import { DATABASE, type Database } from '../../infra/database/database.module.js';
import { newUuid } from '../../infra/database/id.js';
import { spaces, userCredentials, users } from '../../infra/database/schema.js';
import { UsersService } from './users.service.js';

export const DEFAULT_ADMIN_NAME = 'Admin';

export interface FirstAdmin {
  email: string;
  password: string;
  displayName?: string;
}

/**
 * Creates the first administrator together with the "Hello World" starter space, in one transaction
 * (what scripts/localess/admin-user.mjs did against Firebase). Deliberately not an HTTP endpoint: an
 * unauthenticated "claim the admin account" route is what the old `setup` callable was removed for.
 *
 * Runs from the CLI (`admin:create`), or on boot when LOCALESS_ADMIN_EMAIL and LOCALESS_ADMIN_PASSWORD
 * are set and the database has no users yet.
 */
@Injectable()
export class FirstAdminService implements OnApplicationBootstrap {
  private readonly logger = new Logger(FirstAdminService.name);

  constructor(
    @Inject(DATABASE) private readonly db: Database,
    @Inject(APP_CONFIG) private readonly config: AppConfig,
    private readonly users: UsersService,
  ) {}

  async onApplicationBootstrap(): Promise<void> {
    const admin = this.config.firstAdmin;
    if (!admin || (await this.users.count()) > 0) return;
    await this.create(admin);
    this.logger.log(`Created the first admin ${admin.email} and the "Hello World" space`);
  }

  async create(admin: FirstAdmin): Promise<{ userId: string; spaceId: string }> {
    if (admin.password.length < PASSWORD_MIN_LENGTH) {
      throw new Error(`The admin password must be at least ${PASSWORD_MIN_LENGTH} characters`);
    }
    if (await this.users.findByEmail(admin.email)) {
      throw new ConflictException(`A user with the email ${admin.email} already exists`);
    }
    const passwordHash = await hashPassword(admin.password);
    return this.db.transaction(async tx => {
      const [user] = await tx
        .insert(users)
        .values({
          id: newUuid(),
          email: admin.email,
          emailVerified: true,
          displayName: admin.displayName ?? DEFAULT_ADMIN_NAME,
          role: 'admin',
        })
        .returning({ id: users.id });
      await tx.insert(userCredentials).values({ userId: user.id, passwordHash, hashAlgo: 'argon2id' });
      const [space] = await tx
        .insert(spaces)
        .values({ id: newUuid(), name: 'Hello World', locales: [DEFAULT_LOCALE], localeFallback: DEFAULT_LOCALE })
        .returning({ id: spaces.id });
      return { userId: user.id, spaceId: space.id };
    });
  }
}
