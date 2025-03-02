import { Component } from '@angular/core';
import { Performance } from '@angular/fire/performance';
import { Analytics } from '@angular/fire/analytics';
import { MatIconRegistry } from '@angular/material/icon';
import { RouterOutlet } from '@angular/router';

@Component({
  selector: 'll-root',
  standalone: true,
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss'],
  imports: [RouterOutlet],
})
export class AppComponent {
  constructor(
    private readonly performance: Performance,
    private readonly analytics: Analytics,
    private readonly iconRegistry: MatIconRegistry,
  ) {
    iconRegistry.setDefaultFontSetClass('material-symbols-outlined');
  }
}
