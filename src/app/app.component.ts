import { Component } from '@angular/core';
import { Analytics } from '@angular/fire/analytics';
import { Performance } from '@angular/fire/performance';
import { MatIconRegistry } from '@angular/material/icon';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'll-root',
  standalone: true,
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss'],
  imports: [RouterModule],
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
