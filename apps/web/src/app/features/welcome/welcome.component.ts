import { AsyncPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterModule } from '@angular/router';
import { SpaceStore } from '@core/stores/space.store';
import { provideIcons } from '@ng-icons/core';
import { lucidePlus } from '@ng-icons/lucide';
import { HasRolePipe } from '@shared/pipes/has-role.pipe';
import { HlmButtonImports } from '@spartan-ng/helm/button';
import { HlmIconImports } from '@spartan-ng/helm/icon';

@Component({
  selector: 'll-welcome',
  templateUrl: './welcome.component.html',
  styleUrl: './welcome.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [AsyncPipe, RouterModule, HasRolePipe, HlmButtonImports, HlmIconImports],
  providers: [provideIcons({ lucidePlus })],
})
export class WelcomeComponent {
  readonly spaceStore = inject(SpaceStore);
}
