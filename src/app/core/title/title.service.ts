import {Title} from '@angular/platform-browser';
import {Injectable} from '@angular/core';
import {ActivatedRouteSnapshot} from '@angular/router';

import {environment as env} from '../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class TitleService {
  constructor(
    private title: Title
  ) {
  }

  setTitle(snapshot: ActivatedRouteSnapshot): void {
    let lastChild = snapshot;
    while (lastChild.children.length) {
      lastChild = lastChild.children[0];
    }
    const {title} = lastChild.data;

    if (title) {
      this.title.setTitle(`${title} - ${env.appName}`);
    } else {
      this.title.setTitle(env.appName);
    }
  }
}
