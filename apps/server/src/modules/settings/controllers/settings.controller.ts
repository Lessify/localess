import { Body, Controller, Get, Patch } from '@nestjs/common';
import { z } from 'zod';
import { UserPermission } from '@localess/shared';
import { RequireAnyRole, RequirePermission } from '../../../auth/decorators.js';
import { ZodValidationPipe } from '../../../infra/http/zod-validation.pipe.js';
import { SettingsService } from '../services/settings.service.js';

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
  constructor(private readonly settings: SettingsService) {}

  @Get()
  @RequireAnyRole()
  get() {
    return this.settings.get();
  }

  @Patch('ui')
  @RequirePermission(UserPermission.SETTINGS_MANAGEMENT)
  updateUi(@Body(new ZodValidationPipe(uiSchema)) ui: z.infer<typeof uiSchema>) {
    return this.settings.updateUi(ui);
  }
}
