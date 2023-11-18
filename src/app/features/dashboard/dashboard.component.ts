import { ChangeDetectionStrategy, ChangeDetectorRef, Component, DestroyRef, inject } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { MatDialog } from '@angular/material/dialog';
import { Store } from '@ngrx/store';
import { Auth } from '@angular/fire/auth';

import { AppState } from '@core/state/core.state';
import { NotificationService } from '@shared/services/notification.service';
import { TranslationService } from '@shared/services/translation.service';
import { selectSpace } from '@core/state/space/space.selector';
import { filter, switchMap } from 'rxjs/operators';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { combineLatest } from 'rxjs';
import { SchemaService } from '@shared/services/schema.service';
import { AssetService } from '@shared/services/asset.service';
import { ContentService } from '@shared/services/content.service';
import { SpaceService } from '@shared/services/space.service';

@Component({
  selector: 'll-dashboard',
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DashboardComponent {
  isLoading = true;
  private destroyRef = inject(DestroyRef);

  overview$ = this.store.select(selectSpace).pipe(
    filter(it => it.id !== ''), // Skip initial data
    switchMap(it =>
      combineLatest([
        this.spaceService.findById(it.id),
        this.translationService.countAll(it.id),
        this.assetService.countAll(it.id),
        this.contentService.countAll(it.id),
        this.schemaService.countAll(it.id),
      ])
    ),
    takeUntilDestroyed(this.destroyRef)
  );
  // .subscribe({
  //   next: ([space, translations, schemas, assets, contents]) => {
  //     console.log(space.locales.length, translations, schemas, assets, contents);
  //   },
  // });

  constructor(
    private readonly route: ActivatedRoute,
    private readonly router: Router,
    private readonly dialog: MatDialog,
    private readonly cd: ChangeDetectorRef,
    private readonly notificationService: NotificationService,
    private readonly store: Store<AppState>,
    private readonly auth: Auth,
    private readonly spaceService: SpaceService,
    private readonly translationService: TranslationService,
    private readonly schemaService: SchemaService,
    private readonly assetService: AssetService,
    private readonly contentService: ContentService
  ) {}
}
