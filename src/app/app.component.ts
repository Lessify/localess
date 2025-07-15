import { Component, inject } from '@angular/core';
import { Analytics } from '@angular/fire/analytics';
import { Performance } from '@angular/fire/performance';
import { MatIconRegistry } from '@angular/material/icon';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'll-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss'],
  imports: [RouterModule],
})
export class AppComponent {
  private readonly performance = inject(Performance);
  private readonly analytics = inject(Analytics);
  private readonly iconRegistry = inject(MatIconRegistry);

  constructor() {
    const iconRegistry = this.iconRegistry;

    iconRegistry.setDefaultFontSetClass('material-symbols-outlined');
  }
}
