import { BadRequestException, PipeTransform } from '@nestjs/common';
import type { z } from 'zod';

/** `@Body(new ZodValidationPipe(schema))` — parses (and strips unknown keys) or answers 400. */
export class ZodValidationPipe<T extends z.ZodType> implements PipeTransform<unknown, z.infer<T>> {
  constructor(private readonly schema: T) {}

  transform(value: unknown): z.infer<T> {
    const result = this.schema.safeParse(value);
    if (!result.success) {
      throw new BadRequestException({
        statusCode: 400,
        error: 'Bad Request',
        message: 'Validation failed',
        issues: result.error.issues.map(issue => ({ path: issue.path.join('.'), message: issue.message })),
      });
    }
    return result.data;
  }
}
