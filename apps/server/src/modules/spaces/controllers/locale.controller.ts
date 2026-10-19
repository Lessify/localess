import { Controller, Get } from '@nestjs/common';
import { RequireAnyRole } from '../../../auth/decorators.js';
import { LocaleService } from '../services/locale.service.js';

/** Every locale a space can add. Read-only: the list is database data, seeded and changed by migrations. */
@Controller('api/app/locales')
export class LocaleController {
  constructor(private readonly locales: LocaleService) {}

  @Get()
  @RequireAnyRole()
  findAll() {
    return this.locales.findAll();
  }
}
