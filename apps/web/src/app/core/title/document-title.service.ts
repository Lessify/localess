import { inject, Injectable } from '@angular/core';
import { Title } from '@angular/platform-browser';

import { environment as env } from '../../../environments/environment';

/**
 * The browser tab's title: the page's (set by PageTitleStrategy on each navigation), led by an activity while one runs
 * ("42% Translation Export · Localess - Tasks", set by TabActivityService), so either can change without the other.
 */
@Injectable({ providedIn: 'root' })
export class DocumentTitleService {
  private readonly title = inject(Title);
  private page = env.appName;
  private activity?: string;

  setPage(page: string): void {
    this.page = page;
    this.apply();
  }

  setActivity(activity: string | undefined): void {
    this.activity = activity;
    this.apply();
  }

  private apply(): void {
    this.title.setTitle(this.activity ? `${this.activity} · ${this.page}` : this.page);
  }
}
