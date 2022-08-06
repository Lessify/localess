import {Title} from '@angular/platform-browser';
import {Injectable} from '@angular/core';
import {RouterStateSnapshot, TitleStrategy} from '@angular/router';

import {environment as env} from '../../../environments/environment';

@Injectable()
export class PageTitleStrategy extends TitleStrategy {
  constructor(private readonly title: Title) {
    super();
  }

  override updateTitle(routerState: RouterStateSnapshot) {
    const title = this.buildTitle(routerState);
    if (title !== undefined) {
      this.title.setTitle(`${env.appName} - ${title}`);
    } else {
      this.title.setTitle(env.appName);
    }
  }
}
