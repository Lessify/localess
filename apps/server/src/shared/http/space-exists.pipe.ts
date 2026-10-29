import { Injectable, NotFoundException, PipeTransform } from '@nestjs/common';

import { SpaceLookupRepository } from '../repositories/space-lookup.repository.js';

/**
 * `@Param('spaceId', SpaceExistsPipe)`: 404 before the handler runs when no space has the id (a non-UUID included).
 * For a handler that must answer before it can fail: an SSE stream sends its 200 headers as soon as the handler returns,
 * after which a missing space could only close the stream, and `EventSource` reconnects to a closed one forever.
 */
@Injectable()
export class SpaceExistsPipe implements PipeTransform<string, Promise<string>> {
  constructor(private readonly spaceLookupRepository: SpaceLookupRepository) {}

  async transform(spaceId: string): Promise<string> {
    if (!(await this.spaceLookupRepository.exists(spaceId))) throw new NotFoundException('Space not found');
    return spaceId;
  }
}
