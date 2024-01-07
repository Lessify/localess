import { ChangeDetectionStrategy, Component, DestroyRef, inject, Input, OnInit } from '@angular/core';
import { Store } from '@ngrx/store';

import { AppState } from '@core/state/core.state';
import { first, switchMap, tap } from 'rxjs/operators';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { SpaceService } from '@shared/services/space.service';
import { Timestamp } from '@angular/fire/firestore';
import { NotificationService } from '@shared/services/notification.service';
import { Observable } from 'rxjs';
import { Space } from '@shared/models/space.model';

@Component({
  selector: 'll-dashboard',
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DashboardComponent implements OnInit {
  @Input({ required: true })
  spaceId!: string;

  isLoading = true;
  now = Timestamp.now();
  private destroyRef = inject(DestroyRef);

  space$?: Observable<Space>;

  constructor(
    private readonly store: Store<AppState>,
    private readonly notificationService: NotificationService,
    private readonly spaceService: SpaceService
  ) {
    console.log('constructor', this.spaceId);
  }

  ngOnInit(): void {
    this.space$ = this.spaceService.findById(this.spaceId).pipe(
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
