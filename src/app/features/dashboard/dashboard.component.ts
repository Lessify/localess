import { ChangeDetectionStrategy, Component, DestroyRef, inject, input, OnInit } from '@angular/core';
import { Store } from '@ngrx/store';

import { Timestamp } from '@angular/fire/firestore';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { AppState } from '@core/state/core.state';
import { first, switchMap, tap } from 'rxjs/operators';
import { Observable } from 'rxjs';
import { SpaceService } from '@shared/services/space.service';
import { Space } from '@shared/models/space.model';
import { NotificationService } from '@shared/services/notification.service';

@Component({
  selector: 'll-dashboard',
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DashboardComponent implements OnInit {
  // Input
  spaceId = input.required<string>();

  isLoading = true;
  now = Timestamp.now();
  private destroyRef = inject(DestroyRef);

  space$?: Observable<Space>;

  constructor(
    private readonly store: Store<AppState>,
    private readonly notificationService: NotificationService,
    private readonly spaceService: SpaceService
  ) {}

  ngOnInit(): void {
    this.space$ = this.spaceService.findById(this.spaceId()).pipe(
      tap(it => {
        if (it.overview === undefined || (it.overview && this.now.seconds - it.overview.updatedAt.seconds > 86400)) {
          this.spaceService.calculateOverview(it.id).subscribe({ next: () => console.log('Space Overview Updated') });
        }
      }),
      takeUntilDestroyed(this.destroyRef)
    );
  }

  calculateOverview() {
    this.space$
      ?.pipe(
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
