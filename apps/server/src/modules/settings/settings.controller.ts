import { Body, Controller, Get, Inject, Patch } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { z } from 'zod';
import { UserPermission } from '@localess/shared';
import { RequireAnyRole, RequirePermission } from '../../auth/decorators.js';
import { ZodValidationPipe } from '../../infra/http/zod-validation.pipe.js';
import { DATABASE, type Database } from '../../infra/database/database.module.js';
import { settings } from '../../infra/database/schema.js';
import { EventsService } from '../../infra/events/events.service.js';
import { toDto } from '../../infra/http/dto.js';

const uiSchema = z.object({
  text: z.string().max(500).optional(),
  color: z.enum(['primary', 'secondary', 'outline', 'destructive']).optional(),
});

/**
 * Global app settings (was `configs/settings`). Reading is open to every signed-in user because the
 * SPA's AppSettingsStore loads it for everyone (firestore.rules limited reads to SETTINGS_MANAGEMENT);
 * writing still needs SETTINGS_MANAGEMENT.
 */
@Controller('api/app/settings')
export class SettingsController {
  constructor(
    @Inject(DATABASE) private readonly db: Database,
    private readonly events: EventsService,
  ) {}

  @Get()
  @RequireAnyRole()
  async get() {
    const [row] = await this.db.select().from(settings).where(eq(settings.id, 'settings'));
    return row ? toDto(row, ['id']) : {};
  }

  @Patch('ui')
  @RequirePermission(UserPermission.SETTINGS_MANAGEMENT)
  async updateUi(@Body(new ZodValidationPipe(uiSchema)) ui: z.infer<typeof uiSchema>) {
    const [row] = await this.db
      .insert(settings)
      .values({ id: 'settings', ui, updatedAt: new Date() })
      .onConflictDoUpdate({ target: settings.id, set: { ui, updatedAt: new Date() } })
      .returning();
    await this.events.publish({ spaceId: null, entity: 'settings', op: 'updated' });
    return toDto(row, ['id']);
  }
}
