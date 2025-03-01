import { ChangeDetectionStrategy, Component, DestroyRef, effect, inject, input } from '@angular/core';

import { Timestamp } from '@angular/fire/firestore';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { SpaceService } from '@shared/services/space.service';
import { NotificationService } from '@shared/services/notification.service';
import { SpaceStore } from '@shared/stores/space.store';
import { MatToolbar } from '@angular/material/toolbar';
import { CanUserPerformPipe } from '@shared/pipes/can-user-perform.pipe';
import { AsyncPipe } from '@angular/common';
import { MatIconButton } from '@angular/material/button';
import { MatIcon } from '@angular/material/icon';
import { FormatFileSizePipe } from '@shared/pipes/digital-store.pipe';

@Component({
  selector: 'll-dashboard',
  standalone: true,
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    MatToolbar,
    CanUserPerformPipe,
    AsyncPipe,
    MatIconButton,
    MatIcon,
    FormatFileSizePipe,
  ],
})
export class DashboardComponent {
  // Input
  spaceId = input.required<string>();

  now = Timestamp.now();
  private destroyRef = inject(DestroyRef);

  spaceStore = inject(SpaceStore);
  space = this.spaceStore.selectedSpace;

  constructor(
    private readonly notificationService: NotificationService,
    private readonly spaceService: SpaceService,
  ) {
    effect(() => {
      const selectedSpace = this.spaceStore.selectedSpace();
      if (selectedSpace) {
        const { overview } = selectedSpace;
        if (overview === undefined || (overview && this.now.seconds - overview.updatedAt.seconds > 86400)) {
          console.log('Recalculate Overview: Out of date or not existent.');
          this.calculateOverview();
        }
      }
    });
  }

  calculateOverview() {
    this.spaceService
      .calculateOverview(this.spaceId())
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.notificationService.success(`Space overview is recalculated.`);
        },
        error: (err: unknown) => {
          console.error(err);
          this.notificationService.error(`Space overview can not be recalculated.`);
        },
      });
  }
}
