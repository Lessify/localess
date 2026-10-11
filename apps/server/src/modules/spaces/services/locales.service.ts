import { Injectable } from '@nestjs/common';
import { LocalesRepository } from '../repositories/locales.repository.js';

/** Every locale a space can add. Read-only: the list is database data, seeded and changed by migrations. */
@Injectable()
export class LocalesService {
  constructor(private readonly locales: LocalesRepository) {}

  list() {
    return this.locales.findAll();
  }
}
