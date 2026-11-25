import { inject, Injectable } from '@angular/core';
import { RouterStateSnapshot, TitleStrategy } from '@angular/router';

import { environment as env } from '../../../environments/environment';
import { DocumentTitleService } from './document-title.service';

@Injectable()
export class PageTitleStrategy extends TitleStrategy {
  private readonly documentTitle = inject(DocumentTitleService);

  override updateTitle(routerState: RouterStateSnapshot) {
    const title = this.buildTitle(routerState);
    this.documentTitle.setPage(title !== undefined ? `${env.appName} - ${title}` : env.appName);
  }
}
