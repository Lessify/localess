import { Controller, Get } from '@nestjs/common';
import { RequireAnyRole } from '../../../auth/decorators.js';
import { LocalesService } from '../services/locales.service.js';

/** Every locale a space can add. Read-only: the list is database data, seeded and changed by migrations. */
@Controller('api/app/locales')
export class LocalesController {
  constructor(private readonly locales: LocalesService) {}

  @Get()
  @RequireAnyRole()
  findAll() {
    return this.locales.findAll();
  }
}
