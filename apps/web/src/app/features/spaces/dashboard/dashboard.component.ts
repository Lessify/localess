import { PercentPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { SpaceService } from '@core/services/space.service';
import { SpaceOverview } from '@localess/shared';
import { FormatFileSizePipe } from '@shared/pipes/digital-store.pipe';
import { HlmCardImports } from '@spartan-ng/helm/card';
import { HlmProgressImports } from '@spartan-ng/helm/progress';
import { catchError, map, of, startWith, switchMap } from 'rxjs';

type OverviewState = { status: 'loading' } | { status: 'loaded'; overview: SpaceOverview } | { status: 'error' };

/**
 * The space's numbers, computed by the server on each request and refetched live when what they count changes:
 * counters, asset storage and translation progress per locale.
 */
@Component({
  selector: 'll-dashboard',
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [PercentPipe, FormatFileSizePipe, HlmCardImports, HlmProgressImports],
})
export class DashboardComponent {
  private readonly spaceService = inject(SpaceService);

  // Input
  readonly spaceId = input.required<string>();

  private readonly state = toSignal(
    toObservable(this.spaceId).pipe(
      switchMap(spaceId =>
        this.spaceService.overview(spaceId).pipe(
          map((overview): OverviewState => ({ status: 'loaded', overview })),
          startWith<OverviewState>({ status: 'loading' }),
          catchError(() => of<OverviewState>({ status: 'error' })),
        ),
      ),
    ),
    { initialValue: { status: 'loading' } as OverviewState },
  );

  readonly isLoading = computed(() => this.state().status === 'loading');
  readonly isError = computed(() => this.state().status === 'error');
  readonly overview = computed(() => {
    const state = this.state();
    return state.status === 'loaded' ? state.overview : undefined;
  });

  /** Share of the keys a locale has a value for, 0 … 1 (0 when there are no keys). */
  ratio(translated: number, total: number): number {
    return total === 0 ? 0 : translated / total;
  }
}
