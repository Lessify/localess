import { randomInt } from 'node:crypto';

/** Five random lowercase letters and digits, for a clone's name and slug. */
export const randomSuffix = (): string => Array.from({ length: 5 }, () => 'abcdefghijklmnopqrstuvwxyz0123456789'[randomInt(36)]).join('');
