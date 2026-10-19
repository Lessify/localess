import { Injectable } from '@nestjs/common';
import type { Locale } from '@localess/shared';
import { LocaleRepository } from '../repositories/locale.repository.js';

/** Every locale a space can add. Read-only: the list is database data, seeded and changed by migrations. */
@Injectable()
export class LocaleService {
  constructor(private readonly localeRepository: LocaleRepository) {}

  async findAll(): Promise<Locale[]> {
    return this.localeRepository.findAll();
  }
}
