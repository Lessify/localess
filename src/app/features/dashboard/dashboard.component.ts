import { ChangeDetectionStrategy, Component, DestroyRef, inject } from '@angular/core';
import { Store } from '@ngrx/store';

import { AppState } from '@core/state/core.state';
import { selectSpace } from '@core/state/space/space.selector';
import { filter, first, switchMap, tap } from 'rxjs/operators';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { SpaceService } from '@shared/services/space.service';
import { Timestamp } from '@angular/fire/firestore';
import { NotificationService } from '@shared/services/notification.service';

@Component({
  selector: 'll-dashboard',
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DashboardComponent {
  isLoading = true;
  now = Timestamp.now();
  private destroyRef = inject(DestroyRef);

  space$ = this.store.select(selectSpace).pipe(
    filter(it => it.id !== ''), // Skip initial data
    switchMap(it => this.spaceService.findById(it.id)),
    tap(it => {
      if (it.overview === undefined || (it.overview && this.now.seconds - it.overview.updatedAt.seconds > 86400)) {
        this.spaceService.calculateOverview(it.id).subscribe({ next: () => console.log('Space Overview Updated') });
      }
    }),
    takeUntilDestroyed(this.destroyRef)
  );

  constructor(
    private readonly store: Store<AppState>,
    private readonly notificationService: NotificationService,
    private readonly spaceService: SpaceService
  ) {}

  calculateOverview() {
    console.log('calculateOverview');
    this.space$
      .pipe(
        first(),
        switchMap(it => this.spaceService.calculateOverview(it.id))
      )
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
