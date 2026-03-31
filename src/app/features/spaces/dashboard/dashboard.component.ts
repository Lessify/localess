import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, DestroyRef, effect, inject, input } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Timestamp } from '@angular/fire/firestore';
import { provideIcons } from '@ng-icons/core';
import { lucideRotateCw } from '@ng-icons/lucide';
import { CanUserPerformPipe } from '@shared/pipes/can-user-perform.pipe';
import { FormatFileSizePipe } from '@shared/pipes/digital-store.pipe';
import { NotificationService } from '@shared/services/notification.service';
import { SpaceService } from '@shared/services/space.service';
import { SpaceStore } from '@shared/stores/space.store';
import { HlmButtonImports } from '@spartan-ng/helm/button';
import { HlmCardImports } from '@spartan-ng/helm/card';
import { HlmIconImports } from '@spartan-ng/helm/icon';
import { HlmProgressImports } from '@spartan-ng/helm/progress';

@Component({
  selector: 'll-dashboard',
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CanUserPerformPipe, CommonModule, FormatFileSizePipe, HlmButtonImports, HlmIconImports, HlmCardImports, HlmProgressImports],
  providers: [
    provideIcons({
      lucideRotateCw,
    }),
  ],
})
export class DashboardComponent {
  private readonly notificationService = inject(NotificationService);
  private readonly spaceService = inject(SpaceService);

  // Input
  spaceId = input.required<string>();

  now = Timestamp.now();
  private destroyRef = inject(DestroyRef);

  spaceStore = inject(SpaceStore);
  space = this.spaceStore.selectedSpace;

  constructor() {
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
