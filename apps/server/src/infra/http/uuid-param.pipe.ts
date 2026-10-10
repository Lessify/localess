import { Injectable, NotFoundException, PipeTransform } from '@nestjs/common';
import { isUuid } from '../database/id.js';

/**
 * `@Param('id', UuidParamPipe)`: a route id that isn't a UUID can't match any row, and Postgres would reject it in a
 * `uuid` column with a 500, so it answers 404 here like any unknown id.
 */
@Injectable()
export class UuidParamPipe implements PipeTransform<string, string> {
  transform(value: string): string {
    if (!isUuid(value)) throw new NotFoundException();
    return value;
  }
}
