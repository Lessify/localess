import { DOCUMENT } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { NavigationEnd, NavigationError, Router, RouterModule } from '@angular/router';
import { HlmToasterImports } from '@spartan-ng/helm/sonner';
import { filter, take } from 'rxjs';

@Component({
  selector: 'll-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterModule, HlmToasterImports],
})
export class AppComponent {
  private readonly document = inject(DOCUMENT);

  constructor() {
    // The loading screen in index.html (#ll-boot) stays until the first page is shown (its guards ran: the user is
    // known), then fades out.
    inject(Router)
      .events.pipe(
        filter(event => event instanceof NavigationEnd || event instanceof NavigationError),
        take(1),
      )
      .subscribe(() => this.hideLoadingScreen());
  }

  private hideLoadingScreen(): void {
    const screen = this.document.getElementById('ll-boot');
    if (!screen) return;
    screen.classList.add('ll-boot-done');
    setTimeout(() => screen.remove(), 300);
  }
}
