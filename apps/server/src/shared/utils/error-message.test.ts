import { describe, expect, it } from 'vitest';
import { errorMessage } from './error-message.js';

describe('errorMessage', () => {
  it("is an Error's message, and anything else as a string", () => {
    expect(errorMessage(new Error('boom'))).toBe('boom');
    expect(errorMessage('plain')).toBe('plain');
    expect(errorMessage(42)).toBe('42');
    expect(errorMessage(undefined)).toBe('undefined');
  });
});
