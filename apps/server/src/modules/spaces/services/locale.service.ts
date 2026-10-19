import { Injectable } from '@nestjs/common';
import { LocaleRepository } from '../repositories/locale.repository.js';

/** Every locale a space can add. Read-only: the list is database data, seeded and changed by migrations. */
@Injectable()
export class LocaleService {
  constructor(private readonly localeRepository: LocaleRepository) {}

  findAll() {
    return this.localeRepository.findAll();
  }
}
