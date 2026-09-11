import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { provideIcons } from '@ng-icons/core';
import { lucidePlus } from '@ng-icons/lucide';
import { SpaceStore } from '@shared/stores/space.store';
import { HlmButtonImports } from '@spartan-ng/helm/button';
import { HlmIconImports } from '@spartan-ng/helm/icon';

import { SpaceCreateDialogComponent } from '../admin/spaces/space-create-dialog/space-create-dialog.component';
import { SpaceCreateDialogModel } from '../admin/spaces/space-create-dialog/space-create-dialog.model';

@Component({
  selector: 'll-welcome',
  templateUrl: './welcome.component.html',
  styleUrl: './welcome.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [HlmButtonImports, HlmIconImports],
  providers: [provideIcons({ lucidePlus })],
})
export class WelcomeComponent {
  private readonly dialog = inject(MatDialog);
  readonly spaceStore = inject(SpaceStore);

  openCreateSpace(): void {
    // The same dialog the shell and Admin -> Spaces open, so there is one space-creation flow.
    this.dialog.open<SpaceCreateDialogComponent, undefined, SpaceCreateDialogModel>(SpaceCreateDialogComponent, {
      panelClass: 'sm',
    });
  }
}
