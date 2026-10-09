import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterModule } from '@angular/router';
import { HlmToasterImports } from '@spartan-ng/helm/sonner';

@Component({
  selector: 'll-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterModule, HlmToasterImports],
})
export class AppComponent {}
