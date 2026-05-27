import { Component, inject } from '@angular/core';
import { Analytics } from '@angular/fire/analytics';
import { Performance } from '@angular/fire/performance';
import { RouterModule } from '@angular/router';
import { HlmToasterImports } from '@spartan-ng/helm/sonner';

@Component({
  selector: 'll-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss'],
  imports: [RouterModule, HlmToasterImports],
})
export class AppComponent {
  private readonly performance = inject(Performance);
  private readonly analytics = inject(Analytics);

  constructor() {}
}
