import { Inject, Injectable, Logger } from '@nestjs/common';
import nodemailer, { Transporter } from 'nodemailer';
import { APP_CONFIG, type AppConfig } from '../config/config.js';

export interface MailMessage {
  to: string;
  subject: string;
  text: string;
}

/** SMTP mail (replaces the emails Firebase Auth sent). Disabled when LOCALESS_SMTP_URL is unset. */
@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private readonly transport: Transporter | undefined;

  constructor(@Inject(APP_CONFIG) private readonly config: AppConfig) {
    this.transport = config.smtp ? nodemailer.createTransport(config.smtp.url) : undefined;
  }

  get enabled(): boolean {
    return this.transport !== undefined;
  }

  async send(message: MailMessage): Promise<void> {
    if (!this.transport || !this.config.smtp) {
      this.logger.warn(`SMTP is not configured; not sending "${message.subject}"`);
      return;
    }
    await this.transport.sendMail({ from: this.config.smtp.from, ...message });
  }
}
