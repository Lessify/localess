import { expect } from '@playwright/test';

import { E2E_MAIL_PORT } from './env';

export interface Mail {
  to: string[];
  /** Headers and body as sent (the body may be quoted-printable). */
  raw: string;
  receivedAt: number;
}

/** Every mail the catcher (scripts/start-server.mjs) received for this address. */
export async function mailsTo(address: string): Promise<Mail[]> {
  const response = await fetch(`http://127.0.0.1:${E2E_MAIL_PORT + 1}/messages`);
  const mails = (await response.json()) as Mail[];
  return mails.filter(mail => mail.to.some(to => to.toLowerCase() === address.toLowerCase()));
}

/** A mail's text, quoted-printable decoded (soft line breaks joined, `=XX` bytes turned back into characters). */
export function decoded(mail: Mail): string {
  const text = mail.raw.replace(/=\n/g, '');
  return Buffer.from(
    text.replace(/=([0-9A-F]{2})/g, (_, hex: string) => String.fromCharCode(parseInt(hex, 16))),
    'latin1',
  ).toString('utf8');
}

/** Waits for the first mail to this address, and returns it. */
export async function waitForMail(address: string): Promise<Mail> {
  await expect.poll(async () => (await mailsTo(address)).length, { message: `a mail to ${address}` }).toBeGreaterThan(0);
  return (await mailsTo(address))[0];
}
